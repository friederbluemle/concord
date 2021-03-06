package com.walmartlabs.concord.agentoperator.planner;

/*-
 * *****
 * Concord
 * -----
 * Copyright (C) 2017 - 2019 Walmart Inc.
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

import com.walmartlabs.concord.agentoperator.HashUtils;
import com.walmartlabs.concord.agentoperator.resources.AgentConfigMap;
import com.walmartlabs.concord.agentoperator.resources.AgentPod;
import com.walmartlabs.concord.agentoperator.scheduler.AgentPoolInstance;
import io.fabric8.kubernetes.api.model.ConfigMap;
import io.fabric8.kubernetes.api.model.Pod;
import io.fabric8.kubernetes.client.KubernetesClient;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

public class Planner {

    private final KubernetesClient client;

    public Planner(KubernetesClient client) {
        this.client = client;
    }

    public List<Change> plan(AgentPoolInstance poolInstance) throws IOException {
        String resourceName = poolInstance.getName();

        List<Change> changes = new ArrayList<>();

        // process pods marked for removal first
        client.pods()
                .withLabel(AgentPod.TAGGED_FOR_REMOVAL_LABEL)
                .withLabel(AgentPod.POOL_NAME_LABEL, resourceName)
                .list()
                .getItems()
                .stream()
                .map(p -> p.getMetadata().getName())
                .forEach(n -> changes.add(new TryToDeletePodChange(n)));

        List<Pod> pods = AgentPod.list(client, resourceName);
        int currentSize = pods.size();

        // hash of the configuration, will be used to determine which resources should be updated
        String newHash = HashUtils.hashAsHexString(poolInstance.getResource().getSpec());

        // calculate the configmap changes

        boolean recreateAllPods = false;

        String configMapName = configMapName(resourceName);
        ConfigMap m = AgentConfigMap.get(client, configMapName);

        int targetSize = poolInstance.getTargetSize();

        AgentPoolInstance.Status poolStatus = poolInstance.getStatus();
        if (poolStatus == AgentPoolInstance.Status.DELETED) {
            targetSize = 0;
        }

        if (m == null) {
            if (targetSize > 0) {
                changes.add(new CreateConfigMapChange(poolInstance, configMapName));
                recreateAllPods = true;
            }
        } else {
            if (targetSize <= 0 && currentSize == 0) {
                changes.add(new DeleteConfigMapChange(configMapName));
            } else if (AgentConfigMap.hasChanges(client, poolInstance, m)) {
                changes.add(new DeleteConfigMapChange(configMapName));
                changes.add(new CreateConfigMapChange(poolInstance, configMapName));
                recreateAllPods = true;
            }
        }

        // check all pods for cfg changes

        for (Pod p : pods) {
            String currentHash = p.getMetadata().getLabels().get(AgentPod.CONFIG_HASH_LABEL);
            if (!newHash.equals(currentHash)) {
                changes.add(new TagForRemovalChange(p.getMetadata().getName()));
            }
        }

        // recreate all pods if the configmap changed

        if (recreateAllPods) {
            pods.forEach(p -> changes.add(new TagForRemovalChange(p.getMetadata().getName())));
        }

        // create or remove pods according to the configured pool size

        for (int i = 0; i < targetSize; i++) {
            String podName = podName(resourceName, i);

            boolean exists = hasPod(pods, podName);
            if (exists) {
                continue;
            }

            changes.add(new CreatePodChange(poolInstance, podName, configMapName(resourceName), newHash));
        }

        if (currentSize > targetSize) {
            for (int i = targetSize; i < currentSize; i++) {
                String podName = podName(resourceName, i);

                boolean exists = hasPod(pods, podName);
                if (!exists) {
                    continue;
                }

                changes.add(new TagForRemovalChange(podName));
                changes.add(new TryToDeletePodChange(podName));
            }
        }

        return changes;
    }

    private static boolean hasPod(List<Pod> pods, String podName) {
        return pods.stream().anyMatch(p -> p.getMetadata().getName().equals(podName));
    }

    private static String configMapName(String resourceName) {
        return resourceName + "-cfg";
    }

    private static String podName(String resourceName, int i) {
        return String.format("%s-%05d", resourceName, i);
    }
}
