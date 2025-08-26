export const supportedDirectives: {[k: string]: null | string[]} = {
    "case sensitive": null,
    "case insensitive": null,
    "function": ['*'],
    "stage": null,
    // "pre": ['*', '...'],
    // "post": ['*', '...']
}

const directivesLint: {[k: string]: string} = {};
for (const k of Object.keys(supportedDirectives)) {
    directivesLint[ k ] = k;
    directivesLint[ k.replace(/ /g, '\\ ') ] = k;
    directivesLint[ k.replace(/ /g, '\\-') ] = k;
    directivesLint[ '`' + k + '`' ] = k;
    directivesLint[ '`' + k.replace(/ /g, '') + '`' ] = k;
    directivesLint[ '`' + k.replace(/ /g, '-') + '`' ] = k;
}
export const getDirectiveParams = (name: string) =>
    supportedDirectives[directivesLint[name]];
