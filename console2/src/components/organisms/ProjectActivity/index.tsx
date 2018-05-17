import * as React from 'react';
import { connect, Dispatch } from 'react-redux';
import { Redirect, Route, Switch } from 'react-router';
import { Link } from 'react-router-dom';
import { Divider, Header, Icon, Loader, Menu, Segment } from 'semantic-ui-react';

import { ConcordKey, RequestError } from '../../../api/common';
import { ProjectEntry } from '../../../api/org/project';
import { actions, selectors, State } from '../../../state/data/projects';
import { comparators } from '../../../utils';
import { RepositoryList, RequestErrorMessage } from '../../molecules';
import { NotFoundPage } from '../../pages';
import {
    ProcessList,
    ProjectDeleteActivity,
    ProjectRawPayloadActivity,
    ProjectRenameActivity,
    RedirectButton
} from '../index';

export type TabLink = 'process' | 'repository' | 'settings' | null;

interface ExternalProps {
    activeTab: TabLink;
    orgName: ConcordKey;
    projectName: ConcordKey;
}

interface StateProps {
    data?: ProjectEntry;
    loading: boolean;
    error: RequestError;
}

interface DispatchProps {
    load: (orgName: ConcordKey, projectName: ConcordKey) => void;
}

type Props = ExternalProps & StateProps & DispatchProps;

class ProjectActivity extends React.PureComponent<Props> {
    componentDidMount() {
        this.init();
    }

    componentDidUpdate(prevProps: Props) {
        const { orgName: newOrgName, projectName: newProjectName } = this.props;
        const { orgName: oldOrgName, projectName: oldProjectName } = prevProps;

        if (oldOrgName !== newOrgName || oldProjectName !== newProjectName) {
            this.init();
        }
    }

    init() {
        const { orgName, projectName, load } = this.props;
        load(orgName, projectName);
    }

    static renderRepositories(p: ProjectEntry) {
        const repos = p.repositories;
        if (!repos) {
            return <h3>No repositories found</h3>;
        }

        const l = Object.keys(repos)
            .map((k) => repos[k])
            .sort(comparators.byName);

        return (
            <>
                <Menu secondary={true}>
                    <Menu.Item position={'right'}>
                        <RedirectButton
                            icon="plus"
                            positive={true}
                            labelPosition="left"
                            content="Add repository"
                            location={`/org/${p.orgName}/project/${p.name}/repository/_new`}
                        />
                    </Menu.Item>
                </Menu>

                <RepositoryList orgName={p.orgName} projectName={p.name} data={l} />
            </>
        );
    }

    static renderSettings(p: ProjectEntry) {
        return (
            <>
                <Segment>
                    <Header as="h4">Allow payload archives</Header>
                    <ProjectRawPayloadActivity
                        orgName={p.orgName}
                        projectId={p.id}
                        acceptsRawPayload={p.acceptsRawPayload}
                    />
                </Segment>

                <Divider horizontal={true} content="Danger Zone" />

                <Segment color="red">
                    <Header as="h4">Project name</Header>
                    <ProjectRenameActivity
                        orgName={p.orgName}
                        projectId={p.id}
                        projectName={p.name}
                    />

                    <Header as="h4">Delete project</Header>
                    <ProjectDeleteActivity orgName={p.orgName} projectName={p.name} />
                </Segment>
            </>
        );
    }

    render() {
        const { loading, error, data } = this.props;

        if (error) {
            return <RequestErrorMessage error={error} />;
        }

        if (loading || !data) {
            return <Loader active={true} />;
        }

        const { activeTab, orgName, projectName } = this.props;
        const baseUrl = `/org/${orgName}/project/${projectName}`;

        return (
            <>
                <Menu tabular={true}>
                    <Menu.Item active={activeTab === 'process'}>
                        <Icon name="tasks" />
                        <Link to={`/org/${orgName}/project/${projectName}/process`}>Processes</Link>
                    </Menu.Item>
                    <Menu.Item active={activeTab === 'repository'}>
                        <Icon name="code" />
                        <Link to={`/org/${orgName}/project/${projectName}/repository`}>
                            Repositories
                        </Link>
                    </Menu.Item>
                    <Menu.Item active={activeTab === 'settings'}>
                        <Icon name="setting" />
                        <Link to={`/org/${orgName}/project/${projectName}/settings`}>Settings</Link>
                    </Menu.Item>
                </Menu>

                <Switch>
                    <Route path={baseUrl} exact={true}>
                        <Redirect to={`${baseUrl}/process`} />
                    </Route>

                    <Route path={`${baseUrl}/process`} exact={true}>
                        <ProcessList orgName={orgName} projectName={projectName} />
                    </Route>
                    <Route path={`${baseUrl}/repository`} exact={true}>
                        {ProjectActivity.renderRepositories(data)}
                    </Route>

                    <Route path={`${baseUrl}/settings`} exact={true}>
                        {ProjectActivity.renderSettings(data)}
                    </Route>

                    <Route component={NotFoundPage} />
                </Switch>
            </>
        );
    }
}

const mapStateToProps = (
    { projects }: { projects: State },
    { orgName, projectName }: ExternalProps
): StateProps => ({
    data: selectors.projectByName(projects, orgName, projectName),
    loading: projects.loading,
    error: projects.error
});

const mapDispatchToProps = (dispatch: Dispatch<{}>): DispatchProps => ({
    load: (orgName, projectName) => dispatch(actions.getProject(orgName, projectName))
});

export default connect(mapStateToProps, mapDispatchToProps)(ProjectActivity);