
module.exports = function(app){

    app.get('/pagamentos', function(req, res){
        console.log('recebida requisicao de teste');
        res.send('OK');
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
            console.log('pagamento criado');

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

