package com.walmartlabs.concord.runtime.common.injector;

/*-
 * *****
 * Concord
 * -----
 * Copyright (C) 2017 - 2020 Walmart Inc.
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

import java.io.Serializable;
import java.util.UUID;

/**
 * Contains ID of the current process.
 * Can be @Inject-ed into services.
 * @apiNote v2 only
 */
public class InstanceId implements Serializable {

    private static final long serialVersionUID = 1L;

    private final UUID value;

    public InstanceId(UUID value) {
        this.value = value;
    }

    public UUID getValue() {
        return value;
    }
}
