var restifyClients = require('restify-clients');

function CartoesClient(){
     this._cliente =  restifyClients.createJSONClient({
        url: 'http://localhost:3002'
    });
}


CartoesClient.prototype.autoriza = function(cartao, callback){

    this._cliente.post('/cartoes/autoriza', cartao, callback);

}

module.exports = function(){
    return CartoesClient;
}