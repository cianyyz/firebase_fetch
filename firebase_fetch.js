var admin = require('firebase-admin')
var core = require('@actions/core');


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

module.exports = getData
