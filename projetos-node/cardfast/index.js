var app = require('./config/custom-express')();

var porta = '3002'
app.listen(porta, function(){
    console.log(`Servidor rodando na porta ${porta}`);
});

