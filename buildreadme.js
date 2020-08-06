var core = require('@actions/core')

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

module.exports = buildReadMe
