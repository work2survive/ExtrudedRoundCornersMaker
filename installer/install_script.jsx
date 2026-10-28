/**
 * One-Click Installer for Extruded Round Corners Maker
 * Copies ExtrudedRoundCornersMaker.jsx into your After Effects ScriptUI Panels folder.
 */

(function () {
    var SCRIPT_FILENAME = "ExtrudedRoundCornersMaker.jsx";
    var installerFile = new File($.fileName);
    var sourceFile = new File(installerFile.parent.parent.fsName + "/" + SCRIPT_FILENAME);

    if (!sourceFile.exists) {
        // Try same directory
        sourceFile = new File(installerFile.parent.fsName + "/" + SCRIPT_FILENAME);
    }

    if (!sourceFile.exists) {
        alert("Could not locate " + SCRIPT_FILENAME + ".\nPlease ensure it is in the same folder as the installer.", "Installer Error");
        return;
    }

    var aeFolder = Folder.appPackage;
    var targetFolder = new Folder(aeFolder.fsName + "/Scripts/ScriptUI Panels");

    if (!targetFolder.exists) {
        // On macOS or custom install locations
        if (Folder.fs === "Macintosh") {
            targetFolder = new Folder("/Applications/Adobe After Effects " + app.version.split(".")[0] + "/Scripts/ScriptUI Panels");
        } else {
            targetFolder = new Folder(Folder.startup.fsName + "/Scripts/ScriptUI Panels");
        }
    }

    if (!targetFolder.exists) {
        var selectedFolder = Folder.selectDialog("Select your After Effects 'Scripts/ScriptUI Panels' folder:");
        if (selectedFolder) {
            targetFolder = selectedFolder;
        } else {
            alert("Installation cancelled.", "Installer");
            return;
        }
    }

    var destFile = new File(targetFolder.fsName + "/" + SCRIPT_FILENAME);

    sourceFile.copy(destFile);

    if (destFile.exists) {
        alert(
            "Installation Successful!\n\n" +
            "Extruded Round Corners Maker has been installed to:\n" +
            destFile.fsName + "\n\n" +
            "To use it:\n" +
            "1. Restart Adobe After Effects (if open).\n" +
            "2. Go to Window menu > ExtrudedRoundCornersMaker.jsx\n" +
            "3. Dock the panel anywhere in your workspace!",
            "Installation Complete"
        );
    } else {
        alert("Failed to copy script file. You may need Administrator permissions.", "Installation Error");
    }
})();
