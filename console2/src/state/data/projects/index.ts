/*-
 * *****
 * Concord
 * -----
 * Copyright (C) 2017 - 2018 Wal-Mart Store, Inc.
 * -----
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =====
 */
import { push as pushHistory } from 'react-router-redux';
import { Action, combineReducers, Reducer } from 'redux';
import { all, call, put, takeLatest, throttle } from 'redux-saga/effects';

import { ConcordId, ConcordKey } from '../../../api/common';
import {
    createOrUpdate as apiCreateOrUpdate,
    get as apiGet,
    list as apiList,
    rename as apiRename,
    deleteProject as apiDeleteProject,
    setAcceptsRawPayload as apiSetAcceptsRawPayload,
    NewProjectEntry
} from '../../../api/org/project';
import {
    createOrUpdate as apiRepoCreateOrUpdate,
    deleteRepository as apiRepoDelete,
    EditRepositoryEntry,
    refreshRepository as apiRepoRefresh
} from '../../../api/org/project/repository';
import {
    genericResult,
    handleErrors,
    makeErrorReducer,
    makeLoadingReducer,
    makeResponseReducer
} from '../common';
import {
    AddRepositoryRequest,
    CreateProjectRequest,
    CreateRepositoryState,
    DeleteProjectRequest,
    DeleteProjectState,
    DeleteRepositoryRequest,
    DeleteRepositoryState,
    GetProjectRequest,
    ListProjectsRequest,
    ProjectDataResponse,
    Projects,
    RefreshRepositoryRequest,
    RefreshRepositoryState,
    RenameProjectRequest,
    RenameProjectState,
    SetAcceptsRawPayloadRequest,
    SetAcceptsRawPayloadState,
    State,
    UpdateRepositoryRequest,
    UpdateRepositoryState
} from './types';

export { State };

const NAMESPACE = 'projects';

const actionTypes = {
    GET_PROJECT_REQUEST: `${NAMESPACE}/get/request`,
    LIST_PROJECTS_REQUEST: `${NAMESPACE}/list/request`,
    PROJECT_DATA_RESPONSE: `${NAMESPACE}/data/response`,

    CREATE_PROJECT_REQUEST: `${NAMESPACE}/create/request`,

    RENAME_PROJECT_REQUEST: `${NAMESPACE}/rename/request`,
    RENAME_PROJECT_RESPONSE: `${NAMESPACE}/rename/response`,

    SET_ACCEPTS_RAW_PAYLOAD_REQUEST: `${NAMESPACE}/acceptsRawPayload/request`,
    SET_ACCEPTS_RAW_PAYLOAD_RESPONSE: `${NAMESPACE}/acceptsRawPayload/response`,

    DELETE_PROJECT_REQUEST: `${NAMESPACE}/delete/request`,
    DELETE_PROJECT_RESPONSE: `${NAMESPACE}/delete/response`,

    ADD_REPOSITORY_REQUEST: `${NAMESPACE}/repo/add/request`,
    ADD_REPOSITORY_RESPONSE: `${NAMESPACE}/repo/add/response`,

    UPDATE_REPOSITORY_REQUEST: `${NAMESPACE}/repo/update/request`,
    UPDATE_REPOSITORY_RESPONSE: `${NAMESPACE}/repo/update/response`,

    DELETE_REPOSITORY_REQUEST: `${NAMESPACE}/repo/delete/request`,
    DELETE_REPOSITORY_RESPONSE: `${NAMESPACE}/repo/delete/response`,

    REFRESH_REPOSITORY_REQUEST: `${NAMESPACE}/repo/refresh/request`,
    REFRESH_REPOSITORY_RESPONSE: `${NAMESPACE}/repo/refresh/response`,

    RESET_REPOSITORY: `${NAMESPACE}/repo/reset`
};

export const actions = {
    getProject: (orgName: ConcordKey, projectName: ConcordKey): GetProjectRequest => ({
        type: actionTypes.GET_PROJECT_REQUEST,
        orgName,
        projectName
    }),

    listProjects: (orgName: ConcordKey): ListProjectsRequest => ({
        type: actionTypes.LIST_PROJECTS_REQUEST,
        orgName
    }),

    createProject: (orgName: ConcordKey, entry: NewProjectEntry): CreateProjectRequest => ({
        type: actionTypes.CREATE_PROJECT_REQUEST,
        orgName,
        entry
    }),

    renameProject: (
        orgName: ConcordKey,
        projectId: ConcordId,
        projectName: ConcordKey
    ): RenameProjectRequest => ({
        type: actionTypes.RENAME_PROJECT_REQUEST,
        orgName,
        projectId,
        projectName
    }),

    setAcceptsRawPayload: (
        orgName: ConcordKey,
        projectId: ConcordId,
        acceptsRawPayload: boolean
    ): SetAcceptsRawPayloadRequest => ({
        type: actionTypes.SET_ACCEPTS_RAW_PAYLOAD_REQUEST,
        orgName,
        projectId,
        acceptsRawPayload
    }),

    deleteProject: (orgName: ConcordKey, projectName: ConcordKey): DeleteProjectRequest => ({
        type: actionTypes.DELETE_PROJECT_REQUEST,
        orgName,
        projectName
    }),

    addRepository: (
        orgName: ConcordKey,
        projectName: ConcordKey,
        entry: EditRepositoryEntry
    ): AddRepositoryRequest => ({
        type: actionTypes.ADD_REPOSITORY_REQUEST,
        orgName,
        projectName,
        entry
    }),

    updateRepository: (
        orgName: ConcordKey,
        projectName: ConcordKey,
        entry: EditRepositoryEntry
    ): UpdateRepositoryRequest => ({
        type: actionTypes.UPDATE_REPOSITORY_REQUEST,
        orgName,
        projectName,
        entry
    }),

    deleteRepository: (
        orgName: ConcordKey,
        projectName: ConcordKey,
        repoName: ConcordKey
    ): DeleteRepositoryRequest => ({
        type: actionTypes.DELETE_REPOSITORY_REQUEST,
        orgName,
        projectName,
        repoName
    }),

    refreshRepository: (
        orgName: ConcordKey,
        projectName: ConcordKey,
        repoName: ConcordKey
    ): RefreshRepositoryRequest => ({
        type: actionTypes.REFRESH_REPOSITORY_REQUEST,
        orgName,
        projectName,
        repoName
    }),

    resetRepository: (): Action => ({
        type: actionTypes.RESET_REPOSITORY
    })
};

const projectById: Reducer<Projects> = (
    state = {},
    { type, error, items }: ProjectDataResponse
) => {
    switch (type) {
        case actionTypes.PROJECT_DATA_RESPONSE:
            if (error || !items) {
                return {};
            }

            const result = {};
            items.forEach((o) => {
                result[o.id] = o;
            });
            return result;
        default:
            return state;
    }
};

const loading = makeLoadingReducer(
    [
        actionTypes.GET_PROJECT_REQUEST,
        actionTypes.LIST_PROJECTS_REQUEST,
        actionTypes.CREATE_PROJECT_REQUEST
    ],
    [actionTypes.PROJECT_DATA_RESPONSE]
);

const errorMsg = makeErrorReducer(
    [
        actionTypes.GET_PROJECT_REQUEST,
        actionTypes.LIST_PROJECTS_REQUEST,
        actionTypes.CREATE_PROJECT_REQUEST
    ],
    [actionTypes.PROJECT_DATA_RESPONSE]
);

const renameReducers = combineReducers<RenameProjectState>({
    running: makeLoadingReducer(
        [actionTypes.RENAME_PROJECT_REQUEST],
        [actionTypes.RENAME_PROJECT_RESPONSE]
    ),
    error: makeErrorReducer(
        [actionTypes.RENAME_PROJECT_REQUEST],
        [actionTypes.RENAME_PROJECT_RESPONSE]
    ),
    response: makeResponseReducer(
        actionTypes.RENAME_PROJECT_RESPONSE,
        actionTypes.RENAME_PROJECT_RESPONSE
    )
});

const acceptsRawPayloadReducers = combineReducers<SetAcceptsRawPayloadState>({
    running: makeLoadingReducer(
        [actionTypes.SET_ACCEPTS_RAW_PAYLOAD_REQUEST],
        [actionTypes.SET_ACCEPTS_RAW_PAYLOAD_RESPONSE]
    ),
    error: makeErrorReducer(
        [actionTypes.SET_ACCEPTS_RAW_PAYLOAD_REQUEST],
        [actionTypes.SET_ACCEPTS_RAW_PAYLOAD_RESPONSE]
    ),
    response: makeResponseReducer(
        actionTypes.SET_ACCEPTS_RAW_PAYLOAD_RESPONSE,
        actionTypes.SET_ACCEPTS_RAW_PAYLOAD_REQUEST
    )
});

const deleteProjectReducers = combineReducers<DeleteProjectState>({
    running: makeLoadingReducer(
        [actionTypes.DELETE_PROJECT_REQUEST],
        [actionTypes.DELETE_PROJECT_RESPONSE]
    ),
    error: makeErrorReducer(
        [actionTypes.DELETE_PROJECT_REQUEST],
        [actionTypes.DELETE_PROJECT_RESPONSE]
    ),
    response: makeResponseReducer(
        actionTypes.DELETE_PROJECT_RESPONSE,
        actionTypes.DELETE_PROJECT_REQUEST
    )
});

const createRepositoryReducers = combineReducers<CreateRepositoryState>({
    running: makeLoadingReducer(
        [actionTypes.ADD_REPOSITORY_REQUEST],
        [actionTypes.ADD_REPOSITORY_RESPONSE]
    ),
    error: makeErrorReducer(
        [actionTypes.ADD_REPOSITORY_REQUEST],
        [actionTypes.ADD_REPOSITORY_RESPONSE]
    ),
    response: makeResponseReducer(actionTypes.ADD_REPOSITORY_RESPONSE, actionTypes.RESET_REPOSITORY)
});

const updateRepositoryReducers = combineReducers<UpdateRepositoryState>({
    running: makeLoadingReducer(
        [actionTypes.UPDATE_REPOSITORY_REQUEST],
        [actionTypes.UPDATE_REPOSITORY_RESPONSE]
    ),
    error: makeErrorReducer(
        [actionTypes.UPDATE_REPOSITORY_REQUEST],
        [actionTypes.UPDATE_REPOSITORY_RESPONSE]
    ),
    response: makeResponseReducer(
        actionTypes.UPDATE_REPOSITORY_RESPONSE,
        actionTypes.RESET_REPOSITORY
    )
});

const deleteRepositoryReducers = combineReducers<DeleteRepositoryState>({
    running: makeLoadingReducer(
        [actionTypes.DELETE_REPOSITORY_REQUEST],
        [actionTypes.DELETE_REPOSITORY_RESPONSE]
    ),
    error: makeErrorReducer(
        [actionTypes.DELETE_REPOSITORY_REQUEST],
        [actionTypes.DELETE_REPOSITORY_RESPONSE]
    ),
    response: makeResponseReducer(
        actionTypes.DELETE_REPOSITORY_RESPONSE,
        actionTypes.RESET_REPOSITORY
    )
});

const refreshRepositoryReducers = combineReducers<RefreshRepositoryState>({
    running: makeLoadingReducer(
        [actionTypes.REFRESH_REPOSITORY_REQUEST],
        [actionTypes.REFRESH_REPOSITORY_RESPONSE]
    ),
    error: makeErrorReducer(
        [actionTypes.REFRESH_REPOSITORY_REQUEST],
        [actionTypes.REFRESH_REPOSITORY_RESPONSE]
    ),
    response: makeResponseReducer(
        actionTypes.REFRESH_REPOSITORY_RESPONSE,
        actionTypes.RESET_REPOSITORY
    )
});

export const reducers = combineReducers<State>({
    projectById,
    loading,
    error: errorMsg,

    rename: renameReducers,
    acceptRawPayload: acceptsRawPayloadReducers,
    deleteProject: deleteProjectReducers,

    createRepository: createRepositoryReducers,
    updateRepository: updateRepositoryReducers,
    deleteRepository: deleteRepositoryReducers,
    refreshRepository: refreshRepositoryReducers
});

export const selectors = {
    projectByName: (state: State, orgName: ConcordKey, projectName: ConcordKey) => {
        for (const id of Object.keys(state.projectById)) {
            const p = state.projectById[id];
            if (p.orgName === orgName && p.name === projectName) {
                return p;
            }
        }

        return;
    }
};

function* onGet({ orgName, projectName }: GetProjectRequest) {
    try {
        const response = yield call(apiGet, orgName, projectName);
        yield put({
            type: actionTypes.PROJECT_DATA_RESPONSE,
            items: [response] // normalizing the data
        });
    } catch (e) {
        yield handleErrors(actionTypes.PROJECT_DATA_RESPONSE, e);
    }
}

function* onList({ orgName }: ListProjectsRequest) {
    try {
        const response = yield call(apiList, orgName);
        yield put({
            type: actionTypes.PROJECT_DATA_RESPONSE,
            items: response
        });
    } catch (e) {
        yield handleErrors(actionTypes.PROJECT_DATA_RESPONSE, e);
    }
}

function* onCreate({ orgName, entry }: CreateProjectRequest) {
    try {
        yield call(apiCreateOrUpdate, orgName, entry);
        yield put({
            type: actionTypes.PROJECT_DATA_RESPONSE
        });

        yield put(pushHistory(`/org/${orgName}/project/${entry.name}`));
    } catch (e) {
        yield handleErrors(actionTypes.PROJECT_DATA_RESPONSE, e);
    }
}

function* onRename({ orgName, projectId, projectName }: RenameProjectRequest) {
    try {
        yield call(apiRename, orgName, projectId, projectName);
        yield put({
            type: actionTypes.RENAME_PROJECT_RESPONSE
        });

        yield put(pushHistory(`/org/${orgName}/project/${projectName}`));
    } catch (e) {
        yield handleErrors(actionTypes.RENAME_PROJECT_RESPONSE, e);
    }
}

function* onSetAcceptsRawPayload({
    orgName,
    projectId,
    acceptsRawPayload
}: SetAcceptsRawPayloadRequest) {
    try {
        yield call(apiSetAcceptsRawPayload, orgName, projectId, acceptsRawPayload);
        yield put({
            type: actionTypes.SET_ACCEPTS_RAW_PAYLOAD_RESPONSE
        });
    } catch (e) {
        yield handleErrors(actionTypes.SET_ACCEPTS_RAW_PAYLOAD_RESPONSE, e);
    }
}

function* onDelete({ orgName, projectName }: DeleteProjectRequest) {
    try {
        yield call(apiDeleteProject, orgName, projectName);
        yield put({
            type: actionTypes.DELETE_PROJECT_RESPONSE
        });

        yield put(pushHistory(`/org/${orgName}/project/`));
    } catch (e) {
        yield handleErrors(actionTypes.DELETE_PROJECT_RESPONSE, e);
    }
}

function* onAddRepository({ orgName, projectName, entry }: AddRepositoryRequest) {
    try {
        const response = yield call(apiRepoCreateOrUpdate, orgName, projectName, entry);
        yield put(genericResult(actionTypes.ADD_REPOSITORY_RESPONSE, response));

        yield put(pushHistory(`/org/${orgName}/project/${projectName}/repository`));
    } catch (e) {
        yield handleErrors(actionTypes.ADD_REPOSITORY_RESPONSE, e);
    }
}

function* onUpdateRepository({ orgName, projectName, entry }: UpdateRepositoryRequest) {
    try {
        const response = yield call(apiRepoCreateOrUpdate, orgName, projectName, entry);
        yield put(genericResult(actionTypes.ADD_REPOSITORY_RESPONSE, response));

        yield put(pushHistory(`/org/${orgName}/project/${projectName}/repository`));
    } catch (e) {
        yield handleErrors(actionTypes.ADD_REPOSITORY_RESPONSE, e);
    }
}

function* onDeleteRepository({ orgName, projectName, repoName }: DeleteRepositoryRequest) {
    try {
        const response = yield call(apiRepoDelete, orgName, projectName, repoName);
        yield put(genericResult(actionTypes.DELETE_REPOSITORY_RESPONSE, response));
    } catch (e) {
        yield handleErrors(actionTypes.DELETE_REPOSITORY_RESPONSE, e);
    }
}

function* onRefreshRepository({ orgName, projectName, repoName }: RefreshRepositoryRequest) {
    try {
        const response = yield call(apiRepoRefresh, orgName, projectName, repoName);
        yield put(genericResult(actionTypes.REFRESH_REPOSITORY_RESPONSE, response));
    } catch (e) {
        yield handleErrors(actionTypes.REFRESH_REPOSITORY_RESPONSE, e);
    }
}

export const sagas = function*() {
    yield all([
        takeLatest(actionTypes.GET_PROJECT_REQUEST, onGet),
        takeLatest(actionTypes.LIST_PROJECTS_REQUEST, onList),
        takeLatest(actionTypes.CREATE_PROJECT_REQUEST, onCreate),
        takeLatest(actionTypes.RENAME_PROJECT_REQUEST, onRename),
        takeLatest(actionTypes.DELETE_PROJECT_REQUEST, onDelete),
        throttle(2000, actionTypes.SET_ACCEPTS_RAW_PAYLOAD_REQUEST, onSetAcceptsRawPayload),
        takeLatest(actionTypes.ADD_REPOSITORY_REQUEST, onAddRepository),
        takeLatest(actionTypes.UPDATE_REPOSITORY_REQUEST, onUpdateRepository),
        takeLatest(actionTypes.DELETE_REPOSITORY_REQUEST, onDeleteRepository),
        takeLatest(actionTypes.REFRESH_REPOSITORY_REQUEST, onRefreshRepository)
    ]);
};