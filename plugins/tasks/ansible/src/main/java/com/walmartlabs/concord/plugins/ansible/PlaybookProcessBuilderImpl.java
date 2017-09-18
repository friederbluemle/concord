package com.walmartlabs.concord.plugins.ansible;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.File;
import java.io.IOException;
import java.util.*;

@Deprecated
public class PlaybookProcessBuilderImpl implements PlaybookProcessBuilder {

    private static final Logger log = LoggerFactory.getLogger(PlaybookProcessBuilderImpl.class);

    private String attachmentsDir;

    private final String workDir;
    private final String playbook;
    private final String inventory;

    private String cfgFile;
    private Map<String, String> extraVars = Collections.emptyMap();
    private String user;
    private String tags;
    private String privateKey;
    private String vaultPasswordFile;
    private Map<String, String> extraEnv = Collections.emptyMap();
    private boolean debug;
    private int verboseLevel = 0;

    public PlaybookProcessBuilderImpl(String workDir, String playbook, String inventory) {
        this.workDir = workDir;
        this.playbook = playbook;
        this.inventory = inventory;
    }

    @Override
    public PlaybookProcessBuilder withCfgFile(String cfgFile) {
        this.cfgFile = cfgFile;
        return this;
    }

    @Override
    public PlaybookProcessBuilder withExtraVars(Map<String, String> extraVars) {
        this.extraVars = extraVars;
        return this;
    }

    @Override
    public PlaybookProcessBuilder withUser(String user) {
        this.user = user;
        return this;
    }

    @Override
    public PlaybookProcessBuilder withTags(String tags) {
        this.tags = tags;
        return this;
    }

    @Override
    public PlaybookProcessBuilder withPrivateKey(String privateKey) {
        this.privateKey = privateKey;
        return this;
    }

    @Override
    public PlaybookProcessBuilder withAttachmentsDir(String attachmentsDir) {
        this.attachmentsDir = attachmentsDir;
        return this;
    }

    @Override
    public PlaybookProcessBuilder withVaultPasswordFile(String vaultPasswordFile) {
        this.vaultPasswordFile = vaultPasswordFile;
        return this;
    }

    @Override
    public PlaybookProcessBuilder withEnv(Map<String, String> env) {
        this.extraEnv = env;
        return this;
    }

    @Override
    public PlaybookProcessBuilder withDebug(boolean debug) {
        this.debug = debug;
        return this;
    }

    @Override
    public PlaybookProcessBuilder withVerboseLevel(int level) {
        this.verboseLevel = level;
        return this;
    }

    @Override
    public Process build() throws IOException {
        File pwd = new File(workDir);
        if (!pwd.exists()) {
            throw new IOException("Working directory not found: " + pwd);
        }

        if (debug) {
            log.info("build -> working directory: {}", pwd);
        }

        String[] cmd = formatCmd();

        if (debug) {
            log.info("build -> cmd: {}", String.join(" ", cmd));
        }

        ProcessBuilder b = new ProcessBuilder()
                .command(cmd)
                .directory(pwd)
                .redirectErrorStream(true);

        Map<String, String> env = b.environment();
        if (cfgFile != null) {
            env.put("ANSIBLE_CONFIG", cfgFile);
        }
        if (attachmentsDir != null) {
            env.put("_CONCORD_ATTACHMENTS_DIR", attachmentsDir);
        }
        env.putAll(extraEnv);

        if (debug) {
            log.info("build -> env: {}", env);
        }

        return b.start();
    }

    private String[] formatCmd() throws IOException {
        List<String> l = new ArrayList<>(Arrays.asList("ansible-playbook", "-i", inventory, playbook));

        if (extraVars != null && !extraVars.isEmpty()) {
            l.add("-e");
            l.add(toJson(extraVars));
        }

        if (user != null) {
            l.add("-u");
            l.add(user);
        }

        if (tags != null) {
            l.add("-t");
            l.add(tags);
        }

        if (privateKey != null) {
            l.add("--private-key");
            l.add(privateKey);
        }

        if (vaultPasswordFile != null) {
            l.add("--vault-password-file");
            l.add(vaultPasswordFile);
        }

        if (verboseLevel > 0) {
            if (verboseLevel > 4) {
                verboseLevel = 4;
            }

            StringBuilder b = new StringBuilder();
            for (int i = 0; i < verboseLevel; i++) {
                b.append("v");
            }

            l.add("-" + b);
        }

        return l.toArray(new String[l.size()]);
    }

    private static String toJson(Map<String, String> m) throws IOException {
        return new ObjectMapper().writeValueAsString(m);
    }
}
