'use strict';

const VERIFY_TOKEN = "EAAFDmBZCfuxQBAMGHVM2AdxVn9x9MoP3qEcV4dFcZCr4NpiMM3vQsnrHgXfuwqGgxK1J6SCHGZA6KrjZBDPKcYNTGLRHVyv9DawNqo7jKVKhvS9EqW6paTej0cNOyuBcM78KlTH32RnrIoPbJRClGO2ujhA9o4aqrU0xcBCgDQZDZD",
    appUrl = "hhtps://test--chatbot.herokuapp.com";
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

function resetValues()
{
    categories = [];
    categoriesSelected = 0;
    urlEntered = 0;
    skip = 0;
    descLong = "";
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
                // need to establish connection with kurator
                if (urlEntered == 0) {
                    checkURL(sender, event.message.text, urlEntered);
                }
                // if the connection can't be established, send error message
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
        } else {
          console.log('WEBHOOK_ERROR');
          res.sendStatus(403);
        }
    }
});

function doPostback(sender, event)
{
    let payload = event.postback.payload;

    if (payload == "send" && categoriesSelected == 0) {
        console.log("finish !");
        console.log("categories :" + categories);
        categoriesSelected = 1;
        askLong(sender);
        return;
    }
    else if (categoriesSelected == 0) {
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
    }
    if (categoriesSelected == 1 && descLong.length == 0) {
        descLong = payload;
        console.log("DescLong: " + descLong);
        resetValues();
        return;
    }
}

function askLong(sender)
{
    const btnAskLong = {
        "type": "template",
        "payload": {
            "template_type": "button",
            "text": "Entrez votre description et appuyez sur le bouton \"Send\" lorsque vous avez fini:",
            "buttons": [
                {"type": "postback", "title": "Send", "payload": "send"},
            ]
        }
    };
    skip = 3;
    sendTextMessage(sender, "Entrez votre description.");
    //createBtn(sender, btnAskLong);
}

function checkURL(sender, text)
{
    // need to recover categories, send has many buttons as needed
    const btnData =
    [{
        "type": "template",
        "payload": {
            "template_type": "button",
            "text": "Choisissez les catégories :",
            "buttons": [
                {"type": "postback", "title": "test 1", "payload": "1"},
                {"type": "postback", "title": "test 2", "payload": "2"},
                {"type": "postback", "title": "test 3", "payload": "3"}
            ]}
        },
        {
            "type": "template",
            "payload": {
                "template_type": "button",
                "text": "Choisissez les catégories :",
                "buttons": [
                    {"type": "postback", "title": "test 4", "payload": "4"},
                    {"type": "postback", "title": "test 5", "payload": "5"},
                    {"type": "postback", "title": "test 6", "payload": "6"}
                ]
            }
        }
    ];
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
    console.log("message: " + text);
    if (urlEntered == 0 && validUrl.isUri(text)){
        let index = 0;
        let indexLimit = btnData.length - 1;
        console.log('Looks like an URI');
        urlEntered = 1;
        createBtn(sender, btnData, index, indexLimit, createBtn);
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