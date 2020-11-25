'use strict';

const VERIFY_TOKEN = "EAAGCK9WZBPQoBAHJw8WypcdSU9lsVwtqZBDRmaQEuWiQYL569rZCSwmfZCZA6M37DAlgoYlO209tEHAALywGDfE7SrKCZBo6FaYKK9KpzDws1hLZCGAUlywJAbBL2wWiDqR56sZAodr9RSbPNlNta0PViudfD0jMigFVgVB6UYvZBEwZDZD",
    appUrl = "https://test--chatbot.herokuapp.com";
const kuratorUrl = "https://app.posteria.fr",
    imageUrl = "http://image-kurator.fr/app";
const { SSL_OP_SSLEAY_080_CLIENT_DH_BUG } = require('constants');
const { fstat } = require('fs');
const { parse } = require('path');
//  Imports dependencies and set up http server
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

const getRandom = (min, max) => (Math.floor(Math.random() * ((max - min) + min)));

//Quand le tweet est bon
var rewardsUrlOk = [
    "Génial ce tweet ! \u{1F609}",
    "Super tweet ! \u{1F929}",
    "Beau travail !  \u{1F642}",
	"Well done ! \u{1F917}",
	"Very well \u{1F618}",
	"Very good \u{1F44D}",
	"Bravo \u{1F44F}",
	"Tweet validé \u{1F642}",
	"Good work \u{1F44A}",
	"Tweet ok \u{1F3FE}",
	"Ton tweet est excellent \u{1F60E}",
	"Géniiiiial !!!!! \u{1F60D}",
	"Bon boulot !!! \u{1F601}"
];

//Quand catégories ok
var rewardsCategoriesOk = [
    "Super ! \u{1F60F}",
    "Catégorie validée ! \u{1F603}",
    "Great job \u{1F609}",
	"Bon boulot \u{1F601}",
	"Bonne déduction \u{1F638}",
	"Excellent choix de catégorie \u{1F609}",
	"Catégorie(s) acceptée(s) \u{1F61C}",
	"Good \u{1F61C}",
	"Très bien \u{1F609}",
	"Perfect \u{1F60F}",
	"Epatant \u{1F60A}",
	"Vous faites un travail admirable \u{1F603}"
];

//Quand insight ok
var rewardsInsightOk = [
    "Super commentaire \u{1F604}",
    "Génial ! \u{1F603}",
    "Commentaire validé \u{1F60F}",
	"Commentaire intéressant ! \u{1F60F}",
	"Great ! \u{1F63A}",
	"Great work ! \u{1F60F}",
	"Excellent \u{1F440}",
	"Très bien \u{1F609}",
	"Geniiiial \u{1F604}",
	"Good commentary \u{1F60A}",
	"Très intéressant ! \u{1F642}",
	"Very interesting! \u{1F44A}",
	"Beau travail ! \u{1F607}"
];

//Quand publication OK
var rewardsPublishOk = [
    "Bravooo \u{1F60F}",
    "Goooaaaal \u{1F603}",
    "Good game ! \u{1F604}",
	"Au top \u{1F917}",
	"Bien joué ! \u{1F60A}",
	"Congratulatiiion \u{1F389}",
	"Votre article vient d’être publié \u{1F60C}",
	"Félicitation \u{1F44C}",
	"Vous avez réussi votre publication ! \u{1F604}",
	"Article published \u{1F642}",
	"Excellent travail \u{2705}",
	"Parfait \u{1F63B}",
	"Bravo !!!!!! \u{1F340}"
];

let allUsers = {};

function resetValues(user)
{
    user.sender = 0;
    user.urlEntered = 0;
    user.isConnected = 0;
    user.articleUrl = "";
    user.platform = "";
    user.allCategories = [];
    user.allCategoriesId = [];
    user.allAuthors = [];
    user.allAuthorsId = [];
    user.categories = [];
    user.categoriesSelected = 0;
    user.skip = 0;
    user.descLong = "";
    user.author = "";
    user.title = "";
    user.image = "";
    user.desc = "";
    user.time = "";
    console.log("Reset done.");
}

app.post('/webhook/', function (req, res)
{
    console.log("WEBHOOK_EVENT_RECEIVED");
    let messaging_events = req.body.entry[0].messaging;
    for (let i = 0; i < messaging_events.length; i++) {
        let event = messaging_events[i];
        let sender = event.sender.id;

        if (undefined === allUsers[sender]) {
            allUsers[sender] = {
                sender: sender,
                urlEntered: 0,
                isConnected: 0,
                articleUrl: "",
                platform: "",
                allCategories: [],
                allCategoriesId: [],
                allAuthors: [],
                allAuthorsId: [],
                categories: [],
                categoriesSelected: 0,
                skip: 0,
                descLong: "",
                author: "",
                title: "",
                image: "",
                desc: "",
                time: "",
            };
        }

        if (allUsers[sender].skip > 1) {
            allUsers[sender].skip--;
        }
        else {
            if (event.message && event.message.text) {
                doMessage(allUsers[sender], event);
            }
            else if (event.postback && event.postback.payload) {
                doPostback(allUsers[sender], event);
            }
            else if (event.account_linking) {
                doLinking(allUsers[sender], event);
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

function doMessage(user, event)
{
    let message = event.message.text;

    if (message == 'reset') {
        resetValues(user);
        return;
    }
    if (user.urlEntered == 0) {
        checkURL(user, message);
        user.skip = 1;
        return;
    }
    if (user.categoriesSelected == 1 && descLong.length == 0) {
        user.descLong = message;
        if (platform == 'wordpress') {
            askAuthor(user);
        } else {
            showPostInfo(user);
        }
        return;
    }
}

function doPostback(user, event)
{
    let payload = event.postback.payload;

    if (user.categoriesSelected == 0) {
        if (payload == "send" && user.categories.length != 0) {
            user.categoriesSelected = 1;
            askLong(user);
            return;
        }
        else {
            let newCategorie = 1;

            for (let i = 0; i < user.categories.length; i++) {
                if (user.categories[i] == payload) {
                    newCategorie = 0;
                    break;
                }
            }
            if (newCategorie == 1) {
                user.categories.push(user.allCategoriesId[parseInt(payload)]);
            }
            return;
        }
    }
    if (user.platform == 'wordpress' && user.author.length == 0) {
        user.author = user.allAuthorsId[parseInt(payload)];
        showPostInfo(user);
        return;
    }
    if (user.time.length == 0) {
        user.time = payload;
        if (user.time == "stop") {
            sendTextMessage(user, {text: "Ok, la publication est annulée."});
            resetValues(user);
        }
        else {
            let postInfos = {
                extern_id: user.sender,
                title: user.title,
                description: user.desc,
                image: user.image,
                link: user.articleUrl,
                categories: user.categories,
                author: user.author,
                userDesc: user.descLong,
                time: user.time
            };
            kuratorRequest('/api/addArticlesChatBot', postInfos, function(err, res, body) {
                try {
                    body = JSON.parse(body);

                    if (body.hasError == false) {
                        sendTextMessage(allUsers[body.sender], {text: rewardsPublishOk[getRandom(0, rewardsPublishOk.length)]});
                    } else {
            		    sendTextMessage(allUsers[body.sender], {text: body.error});
                        return;
                    }
                } catch {
                    console.log("Une erreur s'est produite lors de l'enregistrement de l'article");
                    return;
            	}
            });
        }
        resetValues(user);
        return;
    }
}

function doLinking(user, event)
{
    let linking = event.account_linking;

    if (user.isConnected == 0) {
        if (linking.status == 'linked') {
            user.isConnected = 1;
            console.log('Auth code : ' + linking.authorization_code);
            kuratorRequest('/api/getCategoriesAndAuthors', {extern_id: user.sender}, function(err, res, body) {
                try {
                    body = JSON.parse(body);

                    allUsers[body.sender].platform = body.platform;
                    for (const property in body.categories) {
                        allUsers[body.sender].allCategories.push(property);
                        allUsers[body.sender].allCategoriesId.push(body.categories[property]);
                    }
                    if (allUsers[body.sender].platform == 'wordpress') {
                        for (const property in body.authors) {
                            allUsers[body.sender].allAuthors.push(body.authors[property].username);
                            allUsers[body.sender].allAuthorsId.push(property);
                        }
                    }
                    askCategories(allUsers[body.sender]);
                }
                catch {
                    sendTextMessage(allUsers[body.sender], {text: "Une erreur s'est produite. [2]"});
                    resetValues(allUsers[body.sender]);
                    return;
                }
            });
        } else {
            sendTextMessage(user, {text: 'Impossible de vous connecter à Kurator.'});
            resetValues(user);
        }
    }
}

function askTime(user)
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
    createBtn(user, btnData);
}

function showPostInfo(user)
{
    let showInfoText = [
        {text: rewardsInsightOk[getRandom(0, rewardsInsightOk.length)] + " Voici les informations de votre post :"},
        {text: user.title},
        {text: user.descLong},
        {
            attachment: {
                type: "image",
                payload: {
                    url: imageUrl + user.image
                }
            }
        }
    ];
    let index = 0;
    let indexLimit = showInfoText.length - 1;

    sendTextMessage(user, showInfoText, index, indexLimit, sendTextMessage);
}

function askAuthor(user)
{
    let btnCount = Math.ceil(user.allAuthors.length / 3);
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
        for (j = 0; j < 3 && user.allAuthors[(i * 3) + j]; j++) {
            let buttons = btnData[i].payload.buttons;

            buttons.push({"type": "postback", "title": user.allAuthors[(i * 3) + j], "payload": (i * 3) + j});
        }
    }
    let index = 0;
    let indexLimit = btnData.length - 1;

    createBtn(user, btnData, index, indexLimit, createBtn);
}

function askLong(user)
{
    const textDescLong = {text: rewardsCategoriesOk[getRandom(0, rewardsCategoriesOk.length)] + " Entrez votre description :"};

    user.skip = 2;
    sendTextMessage(user, textDescLong);
}

function askCategories(user)
{
    let btnCount = Math.ceil(user.allCategories.length / 3);
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
        for (j = 0; j < 3 && user.allCategories[(i * 3) + j]; j++) {
            let buttons = btnData[i].payload.buttons;

            buttons.push({"type": "postback", "title": "", "payload": ""});
            buttons[j].title = user.allCategories[(i * 3) + j];
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
    createBtn(user, btnData, index, indexLimit, createBtn);
}

function kuratorRequest(uri, param, callback)
{
    let url = kuratorUrl + uri;
    let headers = {
        'User-Agent': 'Chatbot',
        'Content-Type': 'application/x-www-form-urlencoded'
    };
    let option = {
        url: url,
        method: "POST",
        headers: headers,
        form: param
    };

    request(option, callback);
}

function checkURL(user, text)
{
    let reqParam = {
        url: text,
        sender: user.sender
    };

    console.log("Message: " + text);
    if (user.urlEntered == 0 && validUrl.isUri(text)){
        console.log('Looks like an URI');
        user.urlEntered = 1;
        user.articleUrl = text;
        kuratorRequest("/api/getArticleInfo", reqParam, function(err, res, body) {
            try {
                body = JSON.parse(body);

                if (body.hasError == false && body.parseError == false) {
                    allUsers[body.sender].image = body.image;
                    allUsers[body.sender].title = body.title;
                    allUsers[body.sender].desc = body.description;
                    createBtn(allUsers[body.sender].sender, {
                        "type": "template",
                        "payload": {
                            "template_type": "button",
                            "text": rewardsUrlOk[getRandom(0, rewardsUrlOk.length)] + " Veuillez vous connecter à Kurator :",
                            "buttons": [
                                {"type": "account_link", "url": kuratorUrl + '?extern_id=' + body.sender},
                            ]
                        }
                    });
                }
                else {
                    if(body.error == 'Cannot parse the article.') {
                        sendTextMessage(allUsers[body.sender], {text: 'Nous n\'avons pas pu récupérer l\'article \u{1F614} Nous manquons d\'informations'});
                    } else {
                        sendTextMessage(allUsers[body.sender], {text: body.error});
                    }
                    resetValues(allUsers[body.sender]);
                }
            } catch {
                sendTextMessage(allUsers[body.sender], {text: "Une erreur s'est produite. [1]"});
                resetValues(allUsers[body.sender]);
                return;
            }
        });
        console.log(user);
    } else {
        console.log('Not an URI');
    }
}

function createBtn(user, btnData, index, indexLimit, callback)
{
    console.log(user.sender);
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token:VERIFY_TOKEN},
        method: 'POST',
        json: {
            recipient: {id: user.sender},
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
            callback(user, btnData, index + 1, indexLimit, callback);
        }
    });
}

function sendTextMessage(user, msgData, index, indexLimit, callback)
{
    console.log(user.sender);
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token:VERIFY_TOKEN},
        method: 'POST',
        json: {
            recipient: {id: user.sender},
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
            callback(user, msgData, index + 1, indexLimit, callback);
        }
        else if ((user.platform == 'wall' || user.author.length != 0) && user.time.length == 0 && index >= indexLimit) {
            askTime(user);
        }
    });
}