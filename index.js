const process = require('process');
var core = require('@actions/core')
var admin = require('firebase-admin')
const { spawn } = require('child_process');
const fs = require('fs');

const isRequired = {
    required: true,
};

const credentials = core.getInput('credentials', isRequired);
const databaseURL = core.getInput('databaseurl', isRequired)


const firebase = admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(credentials)),
    databaseURL: databaseURL,
});


const dbType = core.getInput('databasetype', isRequired);
if (dbType != 'realtime' && dbType != 'firestore') {
    core.setFailed(JSON.stringify('Incorrect database type use "realtime" or "firestore"'));
    process.exit(core.ExitCode.Failure)
}

const fetchFromRealtime = (path, doc) => {
    return new Promise((resolve) => {
        var docRef = admin.database().ref(`${path}/${doc})`)
        docRef.on("value", (snapshot) => {
            resolve(snapshot.val())
        }, (error) => {
            core.setFailed('Document does not exist within realtime database')
            process.exit(core.ExitCode.Failure)
        })
    })
}

const fetchFromFirestore = (path, doc) => {
    return new Promise(async (resolve) => {
        const colRef = admin.firestore().collection(path)
        const docRef = colRef.doc(doc)
        const docSnap = await docRef.get()
        if (!docSnap.exists) {
            core.setFailed('Document does not exist within firestore')
            process.exit(core.ExitCode.Failure)
        }
        data = docSnap.data()
        resolve(data)
    })
}

const getData = () => {
    return new Promise((resolve) => {
        const path = core.getInput('path', isRequired)
        const doc = core.getInput('doc', isRequired)
        const fetch = dbType === 'realtime' ? fetchFromRealtime : fetchFromFirestore

        fetch(path, doc).then((obj) => {
            var key = core.getInput('keyvalue', isRequired)
            resolve(obj[key])
        })
    })

}


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
    await exec('git', ['commit', '-m', '' + commitMessage + '']);
    await exec('git', ['push']);
    core.info("Readme updated successfully in the upstream repository");
};

const buildReadMe = (previousContent, newContent) => {
    const tagNameInput = core.getInput('comment_tag_name');
    const tagToLookFor = tagNameInput ? `<!-- ${tagNameInput}:` : `<!-- FIREBASE_VALUE:`;
    const closingTag = '-->';
    const startOfOpeningTagIndex = previousContent.indexOf(
        `${tagToLookFor}START`,
    );
    const endOfOpeningTagIndex = previousContent.indexOf(
        closingTag,
        startOfOpeningTagIndex,
    );
    const startOfClosingTagIndex = previousContent.indexOf(
        `${tagToLookFor}END`,
        endOfOpeningTagIndex,
    );
    if (
        startOfOpeningTagIndex === -1 ||
        endOfOpeningTagIndex === -1 ||
        startOfClosingTagIndex === -1
    ) {
        return previousContent;
    }
    return [
        previousContent.slice(0, endOfOpeningTagIndex + closingTag.length), ,
        newContent,
        previousContent.slice(startOfClosingTagIndex),
    ].join('');
};


getData().then((value) => {

    const README_FILE_PATH = core.getInput('readme_path');
    const readmeData = fs.readFileSync(README_FILE_PATH, "utf8");

    const newReadme = buildReadMe(readmeData, `${value}`);

    if (newReadme !== readmeData) {
        core.info('Writing to ' + README_FILE_PATH);
        fs.writeFileSync(README_FILE_PATH, newReadme);
        if (!process.env.TEST_MODE) {
            try {
                commitReadme();
                process.exit(0);
            } catch (e) {
                core.setFailed(`Error commiting ${e}`)
                process.exit(-1);
            }
        }
    } else {
        core.info('No change detected, skipping');
        process.exit(0);
    }

})