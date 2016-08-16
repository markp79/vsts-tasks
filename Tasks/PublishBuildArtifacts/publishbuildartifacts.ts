/// <reference path="../../definitions/vsts-task-lib.d.ts" />

import os = require('os');
import path = require('path');
import tl = require('vsts-task-lib/task');
import tr = require('vsts-task-lib/toolrunner');

tl.setResourcePath(path.join(__dirname, 'task.json'));

// content is a folder contain artifacts needs to publish.
var pathtoPublish: string = tl.getPathInput('PathtoPublish', true, true);
var artifactName: string = tl.getInput('ArtifactName', true);
var artifactType: string = tl.getInput('ArtifactType', true);
// targetPath is used for file shares
var targetPath: string = tl.getInput('TargetPath');

artifactType = artifactType.toLowerCase();

try {
    var data = {
        artifacttype: artifactType,
        artifactname: artifactName
    };
       
    // upload or copy
    if (artifactType === "container") {
        data["containerfolder"] = artifactName;
            
        // add localpath to ##vso command's properties for back compat of old Xplat agent
        data["localpath"] = pathtoPublish;
        tl.command("artifact.upload", data, pathtoPublish);
    }
    else if (artifactType === "filepath") {
        data["artifactlocation"] = targetPath;

        var artifactPath: string = path.join(targetPath, artifactName);
        tl.mkdirP(artifactPath);

        if (os.platform() == 'win32') {
            var robocopy: tr.ToolRunner = new tr.ToolRunner("robocopy");
            robocopy.arg("/E"); // copy subdirectories, including Empty ones.
            robocopy.arg("/R:3"); // number of Retries on failed copies
            robocopy.arg(pathtoPublish); // source
            robocopy.arg(artifactPath); // destination
            robocopy.arg("*"); // file
            var result: tr.IExecResult = robocopy.execSync();
            if (result.code >= 8) {
                tl.setResult(tl.TaskResult.Failed, tl.loc('RobocopyFailed', result.code))
            }

            tl.command("artifact.associate", data, targetPath);
        }
        else {
            tl.cp("-Rf", path.join(pathtoPublish, "*"), artifactPath);
        }

    }
}
catch (err) {
    tl.setResult(tl.TaskResult.Failed, tl.loc('PublishBuildArtifactsFailed', err.message));
}