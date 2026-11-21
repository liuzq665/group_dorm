package com.dorm.platform.file.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

class FileServiceFileNameTest {
    @TempDir Path temp;

    @Test void windowsIllegalCharactersAreReplacedInsteadOfThrowing() {
        assertEquals("report_final.png", FileService.safeName("report:final.png", "photo"));
        assertEquals("dorm_room.png", FileService.safeName("dorm*room.png", "photo"));
        assertEquals("a_b_.png", FileService.safeName("a<b>.png", "photo"));
        assertEquals("x_y.png", FileService.safeName("x|y.png", "photo"));
        assertEquals("_q_.png", FileService.safeName("\"q\".png", "photo"));
    }

    @Test void clientDirectoryPrefixesAreDropped() {
        assertEquals("IMG_0001.png", FileService.safeName("C:\\Users\\liu\\Pictures\\IMG_0001.png", "photo"));
        assertEquals("IMG_0001.png", FileService.safeName("/home/liu/IMG_0001.png", "photo"));
        assertEquals("IMG_0001.png", FileService.safeName("folder/nested/IMG_0001.png", "photo"));
    }

    @Test void blankDottedAndOversizedNamesFallBackToAUsableName() {
        assertEquals("attachment", FileService.safeName(null, null));
        assertEquals("attachment", FileService.safeName("   ", ""));
        assertEquals("attachment", FileService.safeName("..", "photo"));
        String longName = FileService.safeName("校".repeat(200) + ".jpg", "photo");
        assertFalse(longName.length() > 120);
        assertEquals("jpg", longName.substring(longName.lastIndexOf('.') + 1));
    }

    @Test void configuredStorageDirectoryIsUsedWhenNoSystemOverride() throws Exception {
        Path module = temp.resolve("dorm-platform-backend");
        Path classes = module.resolve("target/classes");
        Files.createDirectories(classes);
        Files.createFile(module.resolve("pom.xml"));
        Path configured = temp.resolve("shared-files");

        assertEquals(configured, FileService.resolveStorageRoot(classes, configured.toString(), temp));
        assertEquals(module.resolve("uploads"), FileService.resolveStorageRoot(classes, "uploads", temp));
    }
}
