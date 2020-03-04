exports.secureGet = function secureGet(context) {
    return {
        security: context.security,
        user: context.user,
    };
};
