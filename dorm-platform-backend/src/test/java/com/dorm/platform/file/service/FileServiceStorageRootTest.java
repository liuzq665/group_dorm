package com.dorm.platform.file.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertEquals;

class FileServiceStorageRootTest {
    @TempDir Path temp;

    @Test void defaultStorageIsAnchoredToBackendModuleRatherThanLaunchDirectory() throws Exception {
        Path module = temp.resolve("dorm-platform-backend");
        Path classes = module.resolve("target/classes");
        Files.createDirectories(classes);
        Files.createFile(module.resolve("pom.xml"));

        assertEquals(module.resolve("uploads"), FileService.resolveStorageRoot(classes, null, temp));
        assertEquals(module.resolve("uploads"), FileService.resolveStorageRoot(classes, "uploads", temp));
    }

    @Test void configuredAbsoluteStoragePathIsPreserved() throws Exception {
        Path module = temp.resolve("dorm-platform-backend");
        Path classes = module.resolve("target/classes");
        Files.createDirectories(classes);
        Files.createFile(module.resolve("pom.xml"));
        Path configured = temp.resolve("shared-files");

        assertEquals(configured, FileService.resolveStorageRoot(classes, configured.toString(), temp));
    }
}
