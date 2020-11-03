'use strict';

const VERIFY_TOKEN = "EAAFDmBZCfuxQBAMGHVM2AdxVn9x9MoP3qEcV4dFcZCr4NpiMM3vQsnrHgXfuwqGgxK1J6SCHGZA6KrjZBDPKcYNTGLRHVyv9DawNqo7jKVKhvS9EqW6paTej0cNOyuBcM78KlTH32RnrIoPbJRClGO2ujhA9o4aqrU0xcBCgDQZDZD",
    appUrl = "hhtps://test--chatbot.herokuapp.com";
const kuratorUrl = "https://preprod.kurator.fr";
const { SSL_OP_SSLEAY_080_CLIENT_DH_BUG } = require('constants');
const { fstat } = require('fs');
const { parse } = require('path');
// Imports dependencies and set up http server
const
    request = require('request'),
    express = require('express'),
    bodyParser = require('body-parser'),
    validUrl = require('valid-url'),
    crypto = require('crypto');

let app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({"extended": false}));

let port = (process.env.PORT || 5000);
app.set('port', port);
app.listen(port, () => console.log('WEBHOOK_OK'));

let categories = [];
let categoriesSelected = 0;
let urlEntered = 0;
let skip = 0;
let descLong = "";
let author = "";
let image = null;

function resetValues()
{
    categories = [];
    categoriesSelected = 0;
    urlEntered = 0;
    skip = 0;
    descLong = "";
    author = "";
    image = null;
    console.log("Reset done.");
}

app.post('/webhook/', function (req, res)
{
    console.log("WEBHOOK_EVENT_RECEIVED");
    let messaging_events = req.body.entry[0].messaging;
    for (let i = 0; i < messaging_events.length; i++) {
        let event = messaging_events[i];
        let sender = event.sender.id;

        if (skip > 0) {
            skip--;
            console.log("Skip count: " + skip);
        }
        else {
            if (event.message && event.message.text) {
                doMessage(sender, event);
            }
            else if (event.postback && event.postback.payload) {
                doPostback(sender, event);
            }
        }
    }
    res.sendStatus(200)
});

app.get('/webhook/', (req, res) => {

    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        }
        else {
            console.log('WEBHOOK_ERROR');
            res.sendStatus(403);
        }
    }
});

function doMessage(sender, event)
{
    let message = event.message.text;

    if (message == 'reset') {
        resetValues();
        return;
    }
    if (urlEntered == 0) {
        checkURL(sender, message);
        return;
    }
    if (categoriesSelected == 1 && descLong.length == 0) {
        descLong = message;
        console.log("DescLong: " + descLong);
        askAuthor(sender);
        return;
    }
}

function doPostback(sender, event)
{
    let payload = event.postback.payload;

    if (categoriesSelected == 0) {
        if (payload == "send" && categories.length != 0) {
            console.log("Finish !");
            console.log("Categories :" + categories);
            categoriesSelected = 1;
            askLong(sender);
            return;
        }
        else {
            let newCategorie = 1;

            for (let i = 0; i < categories.length; i++) {
                if (categories[i] == payload) {
                    newCategorie = 0;
                    break;
                }
            }
            if (newCategorie == 1) {
                categories.push(payload);
            }
            return;
        }
    }
    if (author.length == 0) {
        author = payload;
        console.log("Author : " + author);
        showPostInfo(sender);
        return;
    }
}

function showPostInfo(sender)
{
    let showInfoText = "Voici les informations de votre post :";

    sendTextMessage(sender, showInfoText);
    sendTextMessage(sender, "Description : " + descLong);
    sendTextMessage(sender, "Image : " + image);
}

function askAuthor(sender)
{
    // need to recover authors, send has many authors as needed
    let btnData = [{
        "type": "template",
        "payload": {
            "template_type": "button",
            "text": "Choisissez l'auteur :",
            "buttons": [
                {"type": "postback", "title": "author 1", "payload": "1"},
                {"type": "postback", "title": "author 2", "payload": "2"},
                {"type": "postback", "title": "author 3", "payload": "3"}
            ]
        }
    }];
    btnData.push({
        "type": "template",
        "payload": {
            "template_type": "button",
            "text": "Suite :",
            "buttons": [
                {"type": "postback", "title": "author 4", "payload": "4"},
                {"type": "postback", "title": "author 5", "payload": "5"},
                {"type": "postback", "title": "author 6", "payload": "6"}
            ]
        }
    });
    let index = 0;
    let indexLimit = btnData.length - 1;

    createBtn(sender, btnData, index, indexLimit, createBtn);
}

function askLong(sender)
{
    const textDescLong = "Entrez votre description.";

    skip = 2;
    sendTextMessage(sender, textDescLong);
}

function askCategories(sender)
{
    // need to recover categories, send has many buttons as needed
    let btnData = [{
        "type": "template",
        "payload": {
            "template_type": "button",
            "text": "Choisissez les catégories :",
            "buttons": [
                {"type": "postback", "title": "test 1", "payload": "1"},
                {"type": "postback", "title": "test 2", "payload": "2"},
                {"type": "postback", "title": "test 3", "payload": "3"}
            ]
        }
    },
    {
        "type": "template",
        "payload": {
            "template_type": "button",
            "text": "Suite :",
            "buttons": [
                {"type": "postback", "title": "test 4", "payload": "4"},
                {"type": "postback", "title": "test 5", "payload": "5"},
                {"type": "postback", "title": "test 6", "payload": "6"}
            ]
        }
    }];
    btnData.push({
        "type": "template",
        "payload": {
            "template_type": "button",
            "text": "Quand vous avez sélectionné toute les catégories, appuyez sur le bouton \"send\":",
            "buttons": [
                {"type": "postback", "title": "Send", "payload": "send"},
            ]
        }
    });
    let index = 0;
    let indexLimit = btnData.length - 1;

    createBtn(sender, btnData, index, indexLimit, createBtn);
}

function kuratorRequest(uri, param, callback)
{
    let headers = {
        'User-Agent': 'Chatbot',
        'Content-Type': 'application/x-www-form-urlencoded'
    }
    let option = {
        url: kuratorUrl + uri,
        method: "POST",
        headers: headers,
        form: param
    }
    request(option, callback);
}

function checkURL(sender, text)
{
    let reqParam = {url: text};

    console.log("Message: " + text);
    if (urlEntered == 0 && validUrl.isUri(text)){
        console.log('Looks like an URI');
        urlEntered = 1;
        console.log("Request Param:");
        kuratorRequest("/contents/getArticleInfo", reqParam, function(err, res, body) {
            console.log(body);
            image = kuratorUrl + "/img/contents/" + body.image;
        });
        // need to establish connection with kurator
        // if the connection can't be established, send error message
        askCategories(sender);
    } else {
        console.log('Not an URI');
    }
}

function createBtn(sender, btnData, index, indexLimit, callback)
{
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token:VERIFY_TOKEN},
        method: 'POST',
        json: {
            recipient: {id:sender},
            "message": {attachment:(index != undefined) ? btnData[index] : btnData}
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error creating button: ', error);
        }
        else if (response.body.error) {
            console.log('Error: ', response.body.error);
        }
        if (callback != undefined && index < indexLimit) {
            callback(sender, btnData, index + 1, indexLimit, callback);
        }
    });
}

function sendTextMessage(sender, text)
{
    let messageData = {
      text:text
    };
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token:VERIFY_TOKEN},
        method: 'POST',
        json: {
            recipient: {id:sender},
            message: messageData
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending message: ', error);
        }
        else if (response.body.error) {
            console.log('Error: ', response.body.error);
        }
    });
}