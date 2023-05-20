module.exports = {
    mode: "development",
    entry: [
        './js/src/index.js'
    ],
    output: {
        path: __dirname + '/js/dist/',
        publicPath: "/static/js/dist/",
        filename: "bundle.js"
    },
    devtool: 'eval-cheap-source-map',
    watch: true,
};
