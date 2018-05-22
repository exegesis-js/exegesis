exports.getGreeting = function getGreeting(context) {
    const name = context.params.query.name;
    return {message: `Hello ${name}`};
}
