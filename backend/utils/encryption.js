// backend/utils/encryption.js
function encriptarSimple(texto) {
    let resultado = '';
    for (let i = 0; i < texto.length; i++) {
        resultado += String.fromCharCode(texto.charCodeAt(i) + 3);
    }
    return Buffer.from(resultado, 'binary').toString('base64');
}

function desencriptarSimple(textoEncriptado) {
    const textoBase64 = Buffer.from(textoEncriptado, 'base64').toString('binary');
    let resultado = '';
    for (let i = 0; i < textoBase64.length; i++) {
        resultado += String.fromCharCode(textoBase64.charCodeAt(i) - 3);
    }
    return resultado;
}

module.exports = {
    encriptarSimple,
    desencriptarSimple
};