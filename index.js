'use strict';

const VERIFY_TOKEN = "EAAFDmBZCfuxQBAMGHVM2AdxVn9x9MoP3qEcV4dFcZCr4NpiMM3vQsnrHgXfuwqGgxK1J6SCHGZA6KrjZBDPKcYNTGLRHVyv9DawNqo7jKVKhvS9EqW6paTej0cNOyuBcM78KlTH32RnrIoPbJRClGO2ujhA9o4aqrU0xcBCgDQZDZD",
    appUrl = "https://test--chatbot.herokuapp.com";
const kuratorUrl = "https://app.kurator.fr",
    imageUrl = "http://image-kurator.fr/app";
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

let sender = null,
    urlEntered = 0,
    isConnected = 0,
    platform = "",
    allCategories = [],
    allAuthors = [],
    categories = [],
    categoriesSelected = 0,
    skip = 0,
    descLong = "",
    author = "",
    title = "",
    image = "",
    time = "";

function resetValues()
{
    sender = null;
    urlEntered = 0;
    isConnected = 0;
    platform = "";
    allCategories = [];
    allAuthors = [];
    categories = [];
    categoriesSelected = 0;
    skip = 0;
    descLong = "";
    author = "";
    title = "";
    image = "";
    time = "";
    console.log("Reset done.");
}

app.post('/webhook/', function (req, res)
{
    console.log("WEBHOOK_EVENT_RECEIVED");
    let messaging_events = req.body.entry[0].messaging;
    for (let i = 0; i < messaging_events.length; i++) {
        let event = messaging_events[i];
        sender = event.sender.id;

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
            else if (event.account_linking) {
                doLinking(sender, event);
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
        skip = 1;
        return;
    }
    if (categoriesSelected == 1 && descLong.length == 0) {
        descLong = message;
        console.log("DescLong: " + descLong);
        if (platform == 'wordpress') {
            askAuthor(sender);
        } else {
            askTime(sender);
        }
        return;
    }
}

function doPostback(sender, event)
{
    let payload = event.postback.payload;

    if (categoriesSelected == 0) {
        if (payload == "send" && categories.length != 0) {
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
    if (time.length == 0) {
        time = payload;
        if (time == "stop") {
            sendTextMessage(sender, {text: "Ok, la publication est annulée."});
        }
        else {
            sendTextMessage(sender, {text: "Ok, la publication est programmé !"});
            // need to program the post on kurator
        }
        resetValues();
        return;
    }
}

function doLinking(sender, event)
{
    let linking = event.account_linking;

    if (isConnected == 0) {
        if (linking.status == 'linked') {
            isConnected = 1;
            console.log('Auth code : ' + linking.authorization_code);
            kuratorRequest('/api/getCategoriesAndAuthors', {extern_id : sender}, function(err, res, body) {
                try {
                    body = JSON.parse(body);
                    platform = body.platform;
                    for (const property in body.categories) {
                        allCategories.push(property);
                    }
                    if (platform == 'wordpress') {
                        for (const property in body.authors) {
                            allAuthors.push(property);
                        }
                    }
                    askCategories(sender);
                }
                catch {
                    sendTextMessage(sender, {text: "Une erreur s'est produite."});
                    resetValues();
                    return;
                }
            });
        } else {
            sendTextMessage(sender, {text: 'Impossible de vous connecter à Kurator.'});
            resetValues();
        }
    }
}

function askTime(sender)
{
    const btnData = {
        "type": "template",
        "payload": {
            "template_type": "button",
            "text": "Choisissez le moment de publication :",
            "buttons": [
                {"type": "postback", "title": "Immédiatement", "payload": "now"},
                {"type": "postback", "title": "Dans le tunnel de publication", "payload": "tunnel"},
                {"type": "postback", "title": "Annulation", "payload": "stop"}
            ]
        }
    };
    createBtn(sender, btnData);
}

function showPostInfo(sender)
{
    let showInfoText = [
        {text: "Voici les informations de votre post :"},
        {text: title},
        {text: descLong},
        {
            attachment: {
                type: "image",
                payload: {
                    url: image
                }
            }
        }
    ];
    let index = 0;
    let indexLimit = showInfoText.length - 1;

    sendTextMessage(sender, showInfoText, index, indexLimit, sendTextMessage);
}

function askAuthor(sender)
{
    //allAuthors = ["test 1", "test 2", "test 3", "test 4", "test 5", "test 6"];
    let btnCount = Math.ceil(allAuthors.length / 3);
    let btnData = [];

    for (let i = 0, j = 0; i < btnCount; i++) {
        btnData.push({
            "type": "template",
            "payload": {
                "template_type": "button",
                "text": (i == 0) ? "Choisissez un auteur :" : "Suite :",
                "buttons": []
            }
        });
        for (j = 0; j < 3 && allAuthors[(i * 3) + j]; j++) {
            let buttons = btnData[i].payload.buttons;

            buttons.push({"type": "postback", "title": allAuthors[(i * 3) + j], "payload": (i * 3) + j});
        }
    }
    let index = 0;
    let indexLimit = btnData.length - 1;

    createBtn(sender, btnData, index, indexLimit, createBtn);
}

function askLong(sender)
{
    const textDescLong = {text: "Entrez votre description."};

    skip = 2;
    sendTextMessage(sender, textDescLong);
}

function askCategories(sender)
{
    //allCategories = ["test 1", "test 2", "test 3", "test 4"];
    let btnCount = Math.ceil(allCategories.length / 3);
    let btnData = [];

    for (let i = 0, j = 0; i < btnCount; i++) {
        btnData.push({
            "type": "template",
            "payload": {
                "template_type": "button",
                "text": "",
                "buttons": []
            }
        });
        btnData[i].payload.text = (i == 0) ? "Choisissez une ou plusieurs catégorie(s) :" : "Suite :";
        for (j = 0; j < 3 && allCategories[(i * 3) + j]; j++) {
            let buttons = btnData[i].payload.buttons;

            buttons.push({"type": "postback", "title": "", "payload": ""});
            buttons[j].title = allCategories[(i * 3) + j];
            buttons[j].payload = (i * 3) + j;
        }
    }
    let index = 0;
    let indexLimit = btnData.length;

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
        kuratorRequest("/api/getArticleInfo", reqParam, function(err, res, body) {
            try {
                body = JSON.parse(body);
                if (body.hasError == false && body.parseError == false) {
                    image = imageUrl + body.image;
                    console.log("Image url : " + image);
                    title = body.title;
                    createBtn(sender, {
                        "type": "template",
                        "payload": {
                            "template_type": "button",
                            "text": "Veuillez vous connecter à Kurator :",
                            "buttons": [
                                {"type": "account_link", "url": kuratorUrl + '?extern_id=' + sender},
                            ]
                        }
                    });
                }
                else {
                    sendTextMessage(sender, {text: body.error});
                }
            }
            catch {
                sendTextMessage(sender, {text: "Une erreur s'est produite."});
                resetValues();
                return;
            }
        });
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
            recipient: {id: sender},
            message: {attachment: (index != undefined) ? btnData[index] : btnData}
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

function sendTextMessage(sender, msgData, index, indexLimit, callback)
{
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token:VERIFY_TOKEN},
        method: 'POST',
        json: {
            recipient: {id: sender},
            message: (index != undefined) ? msgData[index] : msgData
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending message: ', error);
        }
        else if (response.body.error) {
            console.log('Error: ', response.body.error);
        }
        if (callback != undefined && index < indexLimit) {
            callback(sender, msgData, index + 1, indexLimit, callback);
        }
        else if ((author.length != 0 || platform == 'wall') && time.length == 0 && index >= indexLimit) {
            askTime(sender);
        }
    });
}