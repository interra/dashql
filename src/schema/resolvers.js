const _ = require('lodash');
// Sample data
const { dash } = require('./../data/data');

const resolvers = {
    Query: {
        // Fetch all tasks
        getDash: () => dash,
    },
};

module.exports = resolvers;
