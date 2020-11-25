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

let sender = null,
    urlEntered = 0,
    isConnected = 0,
    articleUrl = "",
    platform = "",
    allCategories = [],
    allCategoriesId = [],
    allAuthors = [],
    allAuthorsId = [],
    categories = [],
    categoriesSelected = 0,
    skip = 0,
    descLong = "",
    author = "",
    title = "",
    image = "",
    desc = "",
    time = "";

function resetValues()
{
    sender = null;
    urlEntered = 0;
    isConnected = 0;
    articleUrl = "";
    platform = "";
    allCategories = [];
    allCategoriesId = [];
    allAuthors = [];
    allAuthorsId = [];
    categories = [];
    categoriesSelected = 0;
    skip = 0;
    descLong = "";
    author = "";
    title = "";
    image = "";
    desc = "";
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

        if (skip > 1) {
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
            showPostInfo(sender);
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
                categories.push(allCategoriesId[parseInt(payload)]);
            }
            return;
        }
    }
    if (platform == 'wordpress' && author.length == 0) {
        author = allAuthorsId[parseInt(payload)];
        console.log("Author : " + author);
        showPostInfo(sender);
        return;
    }
    if (time.length == 0) {
        time = payload;
        if (time == "stop") {
            sendTextMessage(sender, {text: "Ok, la publication est annulée."});
            resetValues();
        }
        else {
            let postInfos = {
                extern_id: sender,
                title: title,
                description: desc,
                image: image,
                link: articleUrl,
                categories: categories,
                author: author,
                userDesc: descLong,
                time: time
            }; console.log(postInfos);
            kuratorRequest('/api/addArticlesChatBot', postInfos, function(err, res, body) {
                try{
                    body = JSON.parse(body);
                    console.log(body);
                    if (body.hasError == false) {
                        sendTextMessage(sender, {text: rewardsPublishOk[getRandom(0, rewardsPublishOk.length)]});
                        resetValues();
                    } else {
            		    sendTextMessage(sender, {text: body.error});
                        resetValues();
                        return;
                    }
                } catch {
                    console.log("Une erreur s'est produite lors de l'enregistrement de l'article");
                    resetValues();
                    return;
            	}
            });
        }
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
            kuratorRequest('/api/getCategoriesAndAuthors', {extern_id: sender}, function(err, res, body) {
                try {
                    body = JSON.parse(body);
                    platform = body.platform;
                    for (const property in body.categories) {
                        allCategories.push(property);
                        allCategoriesId.push(body.categories[property]);
                    }
                    if (platform == 'wordpress') {
                        for (const property in body.authors) {
                            allAuthors.push(body.authors[property].username);
                            allAuthorsId.push(property);
                        }
                    }
                    askCategories(sender);
                }
                catch {
                    sendTextMessage(sender, {text: "Une erreur s'est produite. [2]"});
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
        {text: rewardsInsightOk[getRandom(0, rewardsInsightOk.length)] + " Voici les informations de votre post :"},
        {text: title},
        {text: descLong},
        {
            attachment: {
                type: "image",
                payload: {
                    url: imageUrl + image
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
    const textDescLong = {text: rewardsCategoriesOk[getRandom(0, rewardsCategoriesOk.length)] + " Entrez votre description :"};

    skip = 2;
    sendTextMessage(sender, textDescLong);
}

function askCategories(sender)
{
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
    let url = kuratorUrl + uri;
    let headers = {
        'User-Agent': 'Chatbot',
        'Content-Type': 'application/x-www-form-urlencoded'
    }
    let option = {
        url: url,
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
        articleUrl = text;
        kuratorRequest("/api/getArticleInfo", reqParam, function(err, res, body) {
            try {
                console.log(body);
                body = JSON.parse(body);
                if (body.hasError == false && body.parseError == false) {
                    image = body.image;
                    title = body.title;
                    desc = body.description;
                    createBtn(sender, {
                        "type": "template",
                        "payload": {
                            "template_type": "button",
                            "text": rewardsUrlOk[getRandom(0, rewardsUrlOk.length)] + " Veuillez vous connecter à Kurator :",
                            "buttons": [
                                {"type": "account_link", "url": kuratorUrl + '?extern_id=' + sender},
                            ]
                        }
                    });
                }
                else {
                    if(body.error == 'Cannot parse the article.'){
                        sendTextMessage(sender, {text: 'Nous n\'avons pas pu récupérer l\'article \u{1F614} Nous manquons d\'informations'});

                    }else{
                        sendTextMessage(sender, {text: body.error});
                    }
                    resetValues();
                }
            }
            catch {
                sendTextMessage(sender, {text: "Une erreur s'est produite. [1]"});
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
        else if ((platform == 'wall' || author.length != 0) && time.length == 0 && index >= indexLimit) {
            askTime(sender);
        }
    });
}