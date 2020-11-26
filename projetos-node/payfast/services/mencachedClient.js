var memcached = require('memcached');

function createMencachedClient(){
    var cliente = new memcached('localhost:1111', {
        retries: 10,
        retry: 10000,
        remove: true
    });

    return cliente;
}

module.exports = function(){
    return createMencachedClient;
}

