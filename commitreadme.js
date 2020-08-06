var core = require('@actions/core')
const { spawn } = require('child_process');


const commitReadme = async () => {

    const README_FILE_PATH = core.getInput('readme_path');
    const GITHUB_TOKEN = core.getInput('gh_token');
    core.setSecret(GITHUB_TOKEN);

    const exec = (cmd, args = []) => new Promise((resolve, reject) => {
        console.log(`Started: ${cmd} ${args.join(' ')}`);
        const app = spawn(cmd, args, { stdio: ['inherit', 'inherit', 'inherit'] });
        app.on('close', (code) => {
            if (code !== 0) {
                const err = new Error(`Invalid status code: ${code}`);
                err.code = code;
                return reject(err);
            }
            return resolve(code);
        });
        app.on('error', reject);
    });
    // Getting config
    const committerUsername = core.getInput('committer_username');
    const committerEmail = core.getInput('committer_email');
    const commitMessage = core.getInput('commit_message');
    console.log({ committerUsername, committerEmail, commitMessage })
    // Doing commit and push
    await exec('git', [
        'config',
        '--global',
        'user.email',
        committerEmail,
    ]);
    await exec('git', ['remote', 'set-url', 'origin',
        `https://${GITHUB_TOKEN}@github.com/${process.env.GITHUB_REPOSITORY}.git`]);
    await exec('git', ['config', '--global', 'user.name', committerUsername]);
    await exec('git', ['add', README_FILE_PATH]);
    await exec('git', ['commit', '-m', commitMessage]);
    await exec('git', ['push']);
    core.info("Readme updated successfully in the upstream repository");
    jobFailFlag = 1;
    // Making job fail if one of the source fails
    process.exit(jobFailFlag ? 1 : 0);
};

module.exports = commitReadme