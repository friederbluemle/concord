package com.walmartlabs.concord.plugins.http;

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

import com.walmartlabs.concord.sdk.Context;
import org.junit.Test;

import java.util.HashMap;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static org.junit.Assert.*;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

public class HttpTaskTest extends AbstractHttpTaskTest {

    private Context mockContext = mock(Context.class);

    @Test
    public void testForAsStringMethod() throws Exception {
        String response = task.asString("http://localhost:8089/json");
        verify(getRequestedFor(urlEqualTo("/json")));
        assertNotNull(response);
    }

    @Test
    public void testExecuteGetRequestForJson() throws Exception {
        initCxtForRequest(mockContext, "GET", "json", "json", "http://localhost:8089/json");
        task.execute(mockContext);
        verify(getRequestedFor(urlEqualTo("/json")).withHeader("Accept", equalTo("application/json")));
        assertEquals(response.getStatusCode(), 200);
        assertTrue(response.getErrorString().length() == 0);
    }

    @Test
    public void testExecuteGetRequestForString() throws Exception {
        initCxtForRequest(mockContext, "GET", "string", "string", "http://localhost:8089/string");
        task.execute(mockContext);
        verify(getRequestedFor(urlEqualTo("/string")).withHeader("Accept", equalTo("text/plain")));
    }

    @Test
    public void testExecutePostRequestForJson() throws Exception {
        initCxtForRequest(mockContext, "POST", "json", "json", "http://localhost:8089/post");
        when(mockContext.getVariable("body")).thenReturn("{ \"request\": \"PostTest\" }");
        task.execute(mockContext);
        verify(postRequestedFor(urlEqualTo("/post"))
                .withHeader("Accept", equalTo("application/json"))
                .withHeader("Content-Type", equalTo("application/json")));
    }

    @Test
    public void testExecutePostRequestForComplexObject() throws Exception {
        initCxtForRequest(mockContext, "POST", "json", "json", "http://localhost:8089/post");
        HashMap<String, Object> complexObject = new HashMap<>();
        HashMap<String, Object> nestedObject = new HashMap<>();
        nestedObject.put("nestedVar", 123);
        complexObject.put("myObject", nestedObject);
        when(mockContext.getVariable("body")).thenReturn(complexObject);
        task.execute(mockContext);
        verify(postRequestedFor(urlEqualTo("/post"))
                .withHeader("Accept", equalTo("application/json"))
                .withHeader("Content-Type", equalTo("application/json")));
    }

    @Test(expected = IllegalArgumentException.class)
    public void testIllegalArgumentExceptionExceptionForRequest() throws Exception {
        task.execute(mockContext);
    }

    @Test
    public void testGetRequestForResponseContent() throws Exception {
        initCxtForRequest(mockContext, "GET", "json", "json", "http://localhost:8089/json");
        task.execute(mockContext);
        assertNotNull(response);
        assertNotNull(response.getContent());
        assertTrue(response.getContent().length() > 0);
    }

    @Test
    public void testUnsuccessfulResponse() throws Exception {
        initCxtForRequest(mockContext, "GET", "json", "json", "http://localhost:8089/unsuccessful");
        task.execute(mockContext);
        assertNotNull(response);
        assertFalse(response.isSuccess());
        assertTrue(response.getErrorString().length() > 0);
    }

    @Test
    public void testFilePostRequest() throws Exception {
        initCxtForRequest(mockContext, "POST", "file", "json", "http://localhost:8089/file");
        when(mockContext.getVariable("body")).thenReturn("src/test/resources/__files/file.bin");
        task.execute(mockContext);
        assertNotNull(response);
        assertTrue(response.isSuccess());
    }

    @Test(expected = IllegalArgumentException.class)
    public void testForMissingWorkDirForFileGetRequest() throws Exception {
        // Working directory is mandatory for response type file
        initCxtForRequest(mockContext, "GET", "json", "file", "http://localhost:8089/file");
        task.execute(mockContext);

    }

    @Test
    public void testFileGetRequestWithWorkDir() throws Exception {
        initCxtForRequest(mockContext, "GET", "json", "file", "http://localhost:8089/file");
        when(mockContext.getVariable("workDir")).thenReturn(folder.getRoot().toString());
        task.execute(mockContext);
        assertNotNull(response);
        assertTrue(response.isSuccess());
    }

    @Test(expected = IllegalArgumentException.class)
    public void testPostJsonRequestForIncompatibleBody() throws Exception {
        initCxtForRequest(mockContext, "POST", "json", "string", "http://localhost:8089/post");
        when(mockContext.getVariable("body")).thenReturn("src/test/resources/__files/file.bin");
        task.execute(mockContext);
    }

    @Test(expected = IllegalArgumentException.class)
    public void testPostStringRequestForIncompatibleComplexBody() throws Exception {
        initCxtForRequest(mockContext, "POST", "string", "string", "http://localhost:8089/post");
        when(mockContext.getVariable("body")).thenReturn(new HashMap<>());
        task.execute(mockContext);
    }

    @Test(expected = IllegalArgumentException.class)
    public void testPostFileRequestForIncompatibleComplexBody() throws Exception {
        initCxtForRequest(mockContext, "POST", "file", "string", "http://localhost:8089/post");
        when(mockContext.getVariable("body")).thenReturn(new HashMap<>());
        task.execute(mockContext);
    }

    @Test(expected = IllegalArgumentException.class)
    public void testInvalidRequestMethodType() throws Exception {
        initCxtForRequest(mockContext, "GET1", "json", "file", "http://localhost:8089/file");
        task.execute(mockContext);
    }

    @Test(expected = IllegalArgumentException.class)
    public void testInvalidRequestType() throws Exception {
        initCxtForRequest(mockContext, "GET", "json1", "file", "http://localhost:8089/file");
        task.execute(mockContext);
    }

    @Test(expected = IllegalArgumentException.class)
    public void testInvalidResponseType() throws Exception {
        initCxtForRequest(mockContext, "GET", "json", "file1", "http://localhost:8089/file");
        task.execute(mockContext);
    }


}
