module.exports = {
    printWidth: 100,
    tabWidth: 4,
    overrides: [
        {
            files: ["package.json", "*.html"],
            options: {
                useTabs: false,
                tabWidth: 2,
            },
        },
    ],
};
