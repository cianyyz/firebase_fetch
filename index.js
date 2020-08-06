const process = require('process');
const getData = require('./firebase_fetch')
const buildReadMe = require('./buildreadme')
const commitReadme = require('./commitreadme')

getData().then((value) => {

    const README_FILE_PATH = core.getInput('readme_path');
    const readmeData = fs.readFileSync(README_FILE_PATH, "utf8");

    const newReadme = buildReadMe(readmeData, `${value}`);

    if (newReadme !== readmeData) {
        core.info('Writing to ' + README_FILE_PATH);
        fs.writeFileSync(README_FILE_PATH, newReadme);
        if (!process.env.TEST_MODE) {

            commitReadme();
        }
    } else {
        core.info('No change detected, skipping');
        process.exit(0);
    }

})