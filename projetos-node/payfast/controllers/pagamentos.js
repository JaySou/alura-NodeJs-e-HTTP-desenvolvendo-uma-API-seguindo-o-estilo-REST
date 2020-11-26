var logger = require('../services/logger');

module.exports = function(app){

    app.get('/pagamentos', function(req, res){
        console.log('recebida requisicao de teste');
        res.send('OK');
    });

    app.get('/pagamentos/pagamento/:id', function(req, res){
        var id = req.params.id;

        console.log(`consultando pagamento: ${id}`);

        logger.info('consultando pagamento id ' + id);

        var memcachedClient = app.services.mencachedClient();
        memcachedClient.get(`pagamento-${id}`, function(erro, retorno){
            if(erro || !retorno){
                console.log('MISS - chave não encontrada');

                var connection = app.persistencia.connectionFactory();
                var pagamentoDao = new app.persistencia.PagamentoDao(connection);
        
                pagamentoDao.buscaPorId(id, function(erro, resultado){
                    if(erro){
                        console.log(`Erro ao consultar pagamento ${erro}`);
                        res.status(500).json(erro);
                        return;
                    }
        
                    console.log(`pagamento encontrado ${JSON.stringify(resultado)}`);
                    res.status(200).json(resultado);
        
                });
            }
            // HIT no cache
            else{
                console.log(`HIT - valor: ${JSON.stringify(retorno)}`);
                res.status(200).json(retorno);
            }
        });
    });

    app.post('/pagamentos/pagamento', function(req, res){
        
        req.assert('pagamento.forma_de_pagamento', 'o campo eh obrigatorio').notEmpty();
        req.assert('pagamento.valor', 'o campo valor eh obrigatorio e decimal').notEmpty().isFloat();

        var erros = req.validationErrors();

        if(erros){
            return res.status(400).send({mensagem_api: "Erros de Validação", erros });
        }

        var pagamento = req.body.pagamento;
        
        console.log('Processando uma requisição de pagamento');
        
        pagamento.status = "CRIADO";
        pagamento.data = new Date;

        var connection = app.persistencia.connectionFactory();
        var pagamentoDao = new app.persistencia.PagamentoDao(connection);

        pagamentoDao.salva(pagamento, function(erro, resultado){
            
            if(erro) {
                return res.status(500).send(erro);  
               }

            var pagamento_id = resultado.insertId;
            pagamento.id = pagamento_id;
            console.log('pagamento criado');

            var mencachedClient = app.services.mencachedClient();
            mencachedClient.set(`pagamento-${pagamento_id}`, pagamento, 60000, function(erro){
                console.log(`nova chave adicionada ao cache pagamento-${pagamento_id}`);
            });

            if(pagamento.forma_de_pagamento == 'cartao'){
                var cartao = req.body.cartao;
                
                console.log('pagamento por cartao');

                var clienteCartoes = new app.services.clienteCartoes();
                clienteCartoes.autoriza(cartao, function(exception, request, response, retorno){
                    
                    if(exception){
                        console.log(exception);

                        res.status(400).json(exception);
                        return;
                    }

                    res.location(`/pagamentos/pagamento/${pagamento_id}`);
            
                    var response = {
                        dados_do_pagamento:  pagamento,
                        cartao: retorno,
                        links: [
                            {
                                rel: "confirmar",
                                method: "PUT",
                                href: `http://localhost:3001/pagamentos/pagamento/${pagamento_id}`                    
                            },
                            {
                                rel: "cancelar",
                                method: "DELETE",
                                href: `http://localhost:3001/pagamentos/pagamento/${pagamento_id}`                         
                            }
                        ] 
                    }

                    res.status(201).json(response);
                    return;
                    
                });
                
            }
            else {

                res.location(`/pagamentos/pagamento/${pagamento_id}`);
            
                var response = {
                    dados_do_pagamento:  pagamento,
                    links: [
                        {
                            rel: "confirmar",
                            method: "PUT",
                            href: `http://localhost:3001/pagamentos/pagamento/${pagamento_id}`                    
                        },
                        {
                            rel: "cancelar",
                            method: "DELETE",
                            href: `http://localhost:3001/pagamentos/pagamento/${pagamento_id}`                         
                        }
                    ] 
                }
                                
                res.status(201).json(response);
            }
        });
        
    });



    app.put('/pagamentos/pagamento/:id', function(req, res){
        
        var pagamento = {};
        var id = req.params.id;

        pagamento.id = id;
        pagamento.status = 'CONFIRMADO';

        var connection = app.persistencia.connectionFactory();
        var pagamentoDao = new app.persistencia.PagamentoDao(connection);

        pagamentoDao.atualiza(pagamento, function(erro){
            if(erro){
                return res.status(500).send({mensagem: "Erro ao confirmar pagamento", erro });
            }

            res.status(200).send(pagamento);
        });

    });

    app.delete('/pagamentos/pagamento/:id', function(req, res){
        
        var id = req.params.id;
        var pagamento = {};

        pagamento.id = id;
        pagamento.status = 'CANCELADO';

        var connection = app.persistencia.connectionFactory();
        var pagamentoDao = new app.persistencia.PagamentoDao(connection);

        pagamentoDao.atualiza(pagamento, function(erro){
            if(erro){
                return res.status(500).send({mensagem: "Erro ao cancelar pagamento", erro });
            }

            res.status(200).send(pagamento);
        });
    });
}

