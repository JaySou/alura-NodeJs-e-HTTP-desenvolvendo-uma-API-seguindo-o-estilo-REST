var app = require('./config/custom-express')();

var porta = '3001'
app.listen(porta, function(){
    console.log(`Servidor rodando na porta ${porta}`);
});

