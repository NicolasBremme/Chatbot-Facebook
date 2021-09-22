'use strict';

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

const VERIFY_TOKEN = "EAAGCK9WZBPQoBAFtfBeE2c0AaEBZBXiDVx2QIURpDtlgm2aotslZApzOmyHpxo1w2tMTXGyPeAQ7id1BOoVxulnaivH4QN7aS5sj3p2Q8FUIobUQlZBODdkZADTZB4Xj1fBYqvChZCtdc6M77a82A619ZBea1dPmqFNJRYmKJ3YnQQZDZD";

const kuratorUrl = "https://preprod.kurator.fr",
      imageUrl = "http://image-kurator.fr/app",
      appUrl = "https://chatbot.posteria.fr/";

const { SSL_OP_SSLEAY_080_CLIENT_DH_BUG, ENOTEMPTY } = require('constants');
const { response } = require('express');
const { fstat } = require('fs');
const path = require('path');
const replyBotId = 1651592678499031;

const
    request = require('request'),
    express = require('express'),
    bodyParser = require('body-parser'),
    crypto = require('crypto'),
    validUrl = require('valid-url');

let app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({"extended": false}));

let port = (process.env.PORT || 5000);
app.set('port', port);
app.listen(port, () => console.log('WEBHOOK_OK'));
app.use(express.static("public"));

const getRandom = (min, max) => (Math.floor(Math.random() * ((max - min) + min)));
var allUsers = {};

class Step {

    constructor(name, eventType, stepFunction)
    {
        this.name = name;
        this.eventType = eventType;
        this.stepFunction = stepFunction;
    };

    setNextStepArray(nextStepArray) {
        this.nextStepArray = nextStepArray;
    };

    getNextStep(nextStepName) {

        for (let i = 0; i < this.nextStepArray.length; i++){
            if (this.nextStepArray[i].name === nextStepName){
                return (this.nextStepArray[i]);
            }
        }

        return null;
    };
}

function createStepTree()
{
    var step_firstMessage = new Step("firstMessage", ["message", "attachments", "postback"], firstMessage);
    var step_checkURL = new Step("checkURL", ["message", "attachments", "postback"], checkURL);
    var step_actionFromMenu = new Step("actionFromMenu", ["message", "attachments", "postback"], actionFromMenu);
    var step_getSelectedCategory = new Step("getSelectedCategory", ["message", "attachments", "postback"], getSelectedCategory);
    var step_getDescLong = new Step("getDescLong", ["message", "attachments", "postback"], getDescLong);
    var step_getSelectedAuthor = new Step("getSelectedAuthor", ["message", "attachments", "postback"], getSelectedAuthor);
    var step_getSelectedTime = new Step("getSelectedTime", ["message", "attachments", "postback"], getSelectedTime);

    step_firstMessage.setNextStepArray([
        step_checkURL
    ]);

    step_actionFromMenu.setNextStepArray([
        step_checkURL
    ]);

    step_checkURL.setNextStepArray([
        step_actionFromMenu,
        step_getSelectedCategory
    ]);

    //console.log('step_checkURL', step_checkURL);

    step_getSelectedCategory.setNextStepArray([
        step_getDescLong,
        step_getSelectedCategory,
        step_getSelectedAuthor,
        step_getSelectedTime
    ]);

    step_getDescLong.setNextStepArray([
        step_getSelectedAuthor,
        step_getSelectedTime
    ]);

    step_getSelectedAuthor.setNextStepArray([
        step_getSelectedTime
    ]);

    return (step_firstMessage);
}

const stepsDetails = [
    {"event_type" : ["message", "attachments", "postback"], "function": firstMessage},
    {"event_type" : ["message", "attachments", "postback"], "function": actionFromMenu},
    {"event_type" : ["message", "attachments", "postback"], "function": checkURL},
    {"event_type" : ["postback"], "function": getSelectedCategory},
    {"event_type" : ["message"], "function": getDescLong},
    {"event_type" : ["postback"], "function": getSelectedAuthor},
    {"event_type" : ["postback"], "function": getSelectedTime},
];

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

app.post('/proposeArticle/', (req, res) =>
{
    let body = req.body;
    let sender = body.sender;
    let content = body.bestContent.Content;

    createUser(sender);
    allUsers[sender].step = allUsers[sender].step.getNextStep('checkURL');
    //allUsers[sender].step = 2;

    allUsers[sender].tmpContent = content;
    if (content.score == "null" || content.score == null) {
        content.score = 0;
    }

    createBtn(allUsers[sender], {
        attachment: {
            type: "template",
            payload: {
                template_type: "generic",
                elements: [{
                    title: "[" + content.score + "/10] " + content.title,
                    image_url : kuratorUrl + content.image,
                    default_action: {
                        type: "web_url",
                        url: content.link
                    },
                    buttons: [{
                        type: "web_url",
                        url: content.link,
                        title: "Aller sur l'article"
                    },
                    {
                        type: "postback",
                        payload: "do_curation",
                        title: "En faire la Curation"
                    }]
                }]
            }
        }
    });

    res.sendStatus(200);
});

app.get('/loginPosteria/', (req, res) => {

    let code = null;
    let user = null;
    let sender = null;

    if (null != req.query.code) {
        code = parseInt(req.query.code, 10);
    }
    if (null != req.query.sender) {
        sender = parseInt(req.query.sender, 10);
        user = allUsers[sender];
    }
    if (user != null && user.isConnected == 0) {
        if (code == 1 && sender != null) {
            user.isConnected == 1;
            getCategoriesAndAuthors(user);
            return;
        } else {
            sendTextMessage(user, {text: 'Impossible de vous connecter à Posteria.'});
            return;
        }
    }

    user.step = user.step.getNextStep('actionFromMenu');
    showMenu(user);

    let options = {
        root: path.join(__dirname)
    };

    res.sendFile('loginPosteria.html', options);
});

app.post('/webhook/', function (req, res)
{
    try {

        let messaging_events = req.body.entry[0].messaging;
        console.log('messaging_events', messaging_events);
    
        for (let i = 0; i < messaging_events.length; i++){

            let event = messaging_events[i];
            let sender = event.sender.id;

            if (sender == replyBotId){
                res.sendStatus(200);
                return;
            }
    
            if (!allUsers[sender]) {
                createUser(sender);
            }

            console.log('SENDER ID', sender);

            if (event.message && event.message.text && (event.message.text).toLowerCase() == 'reset'){
                delete allUsers[sender].step;
                allUsers[sender].step = createStepTree();
                console.log('User '+sender+' reseted');
                res.sendStatus(200);
                return;
            }

            /*if (!eventType) {
                res.sendStatus(200); 
                return;
            }
    
            let step = allUsers[sender].step;
    
            if (step < 0 || typeof(stepsDetails[step]) == "undefined") {
                res.sendStatus(200);
                return;
            }
    
            let currentStep = stepsDetails[allUsers[sender].step];

            if (currentStep.event_type.includes(eventType)) {
                currentStep.function(allUsers[sender], event);
            }*/

            //console.log('CURRENT_STEP', allUsers[sender].step);
            //console.log('CURRENT_EVENT', event);

            if (allUsers[sender].step !== undefined){
                console.log('TRIGGER STEP FUNCTION', allUsers[sender].step.name);
                allUsers[sender].step.stepFunction(allUsers[sender], event);
            }
        }

        res.sendStatus(200);

    } catch(error) {
        console.log('ERROR: ', error);
        res.sendStatus(403);
    } 
}); 

function createUser(sender)
{
    allUsers[sender] = {
        sender: sender,
        step: createStepTree(),
        isConnected: 0,
        fromMenu: 0,
        tmpContent: "",
        tmpContentSelected: 0,
        articleUrl: "",
        platform: "",
        allCategories: [],
        allCategoriesId: [],
        allAuthors: [],
        allAuthorsId: [],
        tags: [],
        categorie: -1,
        descLong: "",
        author: "",
        title: "",
        image: "",
        desc: "",
        time: "",
    };
}

function getEventType(event, user)
{
    if (event.postback && event.postback.payload) {
        return "postback";
    }

    if (event.message && event.message.text) {
        if (event.message.text == "reset") {
            delete allUsers[user.sender];
            return (null);
        }
        return "message";
    }

    if (event.message && event.message.attachments) {
        return "attachment";
    }

    return (null);
}

function goToStep(user, step, event, callFunction) {
    if (stepsDetails[step] !== undefined) {
        user.step = step;
        if (callFunction !== undefined && event !== undefined && callFunction) {
            stepsDetails[step].function(user, event);
        }
    }
}

function confirmArticle(user)
{
    let content = user.tmpContent;

    user.image = content.image;
    user.title = content.title;
    user.articleUrl = content.link;
    user.desc = content.description;
    user.tmpContentSelected = 1;

    posteriaRequest('/api/autoLogin', {extern_id: user.sender}, function(err, res, body) {
        try {
            body = JSON.parse(body);
            let sender = body.sender;
            let isLogged = body.logged;

            if (body.hasError == true) {
                console.log('[5] ' + body.error);
                sendTextMessage(allUsers[sender], {text: "Une erreur s'est produite."});
                delete allUsers[sender];
                return;
            }

            if (isLogged) {
                //getCategoriesAndAuthors(user);
                allUsers[sender].step = allUsers[sender].step.getNextStep('checkURL');
                //goToStep(user, 3);
            }
        } catch (error) {
            console.log('[9] ' + error);
            sendTextMessage(allUsers[sender], {text: "Une erreur s'est produite."});
        }
    });
}

function showMenu(user, message) {
    if (typeof(message) == "undefined") {
        message = "";
    }

    createQuickReply(user, message + "Choisissez une action:", [
        {
            "content_type" : "text",
            "title" : "Faire une curation",
            "payload" : "menu_curation",
            "image_url" : ""
        },
        {
            "content_type" : "text",
            "title" : "Voir mes stats",
            "payload" : "menu_stat",
            "image_url" : ""
        },
        {
            "content_type" : "text",
            "title" : "Configuration",
            "payload" : "menu_config",
            "image_url" : ""
        }]
    );
    user.fromMenu = 0;
}

function firstMessage(user, event)
{
    console.log('FIRST MESSAGE');

    posteriaRequest('/api/autoLogin', {extern_id: user.sender}, function(err, res, body) {

        try {

            body = JSON.parse(body);
            let sender = body.sender;

            if (body.hasError == true) {
                sendTextMessage(allUsers[sender], {text: "Une erreur s'est produite."});
                delete allUsers[sender];
                console.log(body.error + ' [5]');
                return;
            }

            if (body.logged) {

                allUsers[sender].isConnected = 1;
                allUsers[sender].step = allUsers[sender].step.getNextStep('checkURL');
                allUsers[sender].step.stepFunction(allUsers[sender], event);
                //goToStep(allUsers[sender], 2, event, true);
                return;
            }

            createBtn(allUsers[sender], {
                attachment: {
                    type: "template",
                    payload: {
                        template_type: "button",
                        text: "Bonjour, veuillez vous connecter à Posteria",
                        buttons: [{
                            type: "web_url",
                            url: kuratorUrl + '/api/authorize?extern_id=' + sender,
                            title: "Connexion"
                        }]
                    }
                }
            });
        } catch (x) {
            console.log(x.stack);
            //console.log('[4] ' + error);
            //sendTextMessage(allUsers[sender], {text: "Une erreur s'est produite."});
        }
    });
}

function actionFromMenu(user, event)
{
    try {

        console.log('ACTION FROM MENU');
        console.log(event);

        if (event.message === undefined || event.message.quick_reply === undefined || event.message.quick_reply.payload === undefined) {
            showMenu(user, "Je n'ai pas compris.");
            return;
        }

        switch (event.message.quick_reply.payload) {
            case "menu_curation":
                user.fromMenu = true;
                //sendTextMessage(user, {text: "Parfait! Envoyez-nous un article dont vous souhaiter faire la curation."});
                delete user.step;
                user.step = createStepTree();
                break;
            case "menu_stat":
                showMenu(user, "Cette fonctionnalitée n'est pas encore disponible. ");
                break;
            case "menu_config":
                showMenu(user, "Cette fonctionnalitée n'est pas encore disponible. ");
                break;
            default:
                showMenu(user, "Je n'ai pas compris. ");
                break;
        }

    } catch(error){
        console.log('[15] ' + error);
    }
}

function checkURL(user, event)
{
    console.log('CHECK URL');

    let text = "null"; 

    if (event.postback && event.postback.payload && event.postback.payload == "do_curation") {
        confirmArticle(user);
        return;
    }
    else if (event.message && event.message.text) {
        text = event.message.text;
    }
    else if (event.message && event.message.attachments) {
        let url = event.message.attachments[0].url;

        if (typeof(url) != 'undefined') {
            url = decodeURIComponent(url.split('u=')[1].split('&h=')[0]);
            text = url;
        }
    }

    console.log('text', text);
    console.log('validUrl', validUrl.isUri(text));
    console.log('user', user);

    if (validUrl.isUri(text) == undefined) {
        if (!user.fromMenu) {
            console.log('FROM MENU GO');
            showMenu(user);
            user.step = user.step.getNextStep('actionFromMenu');
        }
        return;
    }
 
    user.articleUrl = text;
    user.step = user.step.getNextStep('getSelectedCategory');
 
    let reqParam = {
        url: text,
        sender: user.sender
    };

    posteriaRequest("/api/getArticleInfo", reqParam, function(err, res, body) {

        body = JSON.parse(body);
        let sender = parseInt(body.sender);

        try {
           
            if (body.hasError == true || body.parseError == true) {
                if (body.error == "Cannot parse the article.") {
                    body.error = "Nous n\'avons pas pu récupérer l\'article \u{1F614} Nous manquons d\'informations";
                }
                sendTextMessage(allUsers[sender], {text: body.error});
                delete allUsers[sender];
                return;
            }

            allUsers[sender].image = body.image;
            allUsers[sender].title = body.title;
            allUsers[sender].desc = body.description;
            
            if (!allUsers[sender].allCategories.length){
                getCategoriesAndAuthors(allUsers[sender], askCategories);
            }
        }
        catch (error) {
            console.log('[3] ' + error);
            sendTextMessage(user, {text: "Une erreur s'est produite."});
        }
    });
}

function getCategoriesAndAuthors(user, callback = null)
{
    posteriaRequest('/api/getCategoriesAndAuthors', {extern_id: user.sender}, function(err, res, body) {
        try {
            body = JSON.parse(body);
            let sender = parseInt(body.sender);

            allUsers[sender].platform = body.platform;
            allUsers[sender].tags = body.tags;

            if (body.categories) {
                for (const property in body.categories) {
                    allUsers[sender].allCategories.push(property);
                    allUsers[sender].allCategoriesId.push(body.categories[property]);
                }
            }

            if ((allUsers[sender].platform && allUsers[sender].platform == 'wordpress') && 
                (body.authors && body.authors.length)) {
                
                for (const property in body.authors) {
                    allUsers[sender].allAuthors.push(body.authors[property].username);
                    allUsers[sender].allAuthorsId.push(property);
                }
            }

            if (callback){
                callback(allUsers[sender]);
            }
        }
        catch (error) {
            console.log('[1] ' + error);
            sendTextMessage(allUsers[user.sender], {text: "Une erreur s'est produite. [2]"});
            return;
        }
    });
}

function askCategories(user) {

    console.log('ASK CATEGORIES');

    let btnCount = Math.ceil(user.allCategories.length / 3);
    let btnData = [];

    for (let i = 0, j = 0; i < btnCount; i++) {
        btnData.push({
            "attachment": {
                "type": "template",
                "payload": {
                    "template_type": "button",
                    "text": "",
                    "buttons": []
                }
            }
        });
        btnData[i].attachment.payload.text = (i == 0) ? "Choisissez une catégorie :" : "‎";
        for (j = 0; j < 3 && user.allCategories[(i * 3) + j]; j++) {
            let buttons = btnData[i].attachment.payload.buttons;

            buttons.push({"type": "postback", "title": "", "payload": ""});
            buttons[j].title = user.allCategories[(i * 3) + j];
            buttons[j].payload = (i * 3) + j;
        }
    }

    console.log('btnData', btnData);

    let index = 0;
    let indexLimit = btnData.length - 1;
    createBtn(user, btnData, index, indexLimit, createBtn);
}

function getSelectedCategory(user, event)
{
    console.log('GET SELECTED CATEGORY');

    let payload = event.postback.payload;

    if (typeof(user.allCategoriesId[parseInt(payload, 10)]) == "undefined") {
        return;
    }
    user.categorie = user.allCategoriesId[parseInt(payload, 10)];
    user.step = user.step.getNextStep('getDescLong');
    askLong(user);
}

function askLong(user)
{
    const textDescLong = {text: rewardsCategoriesOk[getRandom(0, rewardsCategoriesOk.length)] + " Entrez votre description :"};
    sendTextMessage(user, textDescLong);
}

function getDescLong(user, event)
{
    console.log('GET DESC LONG');

    let message = event.message.text;

    if (message.length == 0) {
        return;
    }

    user.descLong = hashtagify(user, message);
    if (user.platform == 'wordpress') {
        askAuthor(user);
        user.step = user.step.getNextStep('getSelectedAuthor');
        return;
    }

    user.step = user.step.getNextStep('getSelectedTime');

    if (user.tmpContentSelected == 0) {
        showPostInfo(user);
        return;
    }
    askTime(user);
}

function hashtagify(user, text)
{
    if (user.platform == "wall") {
        return text;
    }
    let hashtags = Object.keys(user.tags);
    let authorizedEndingChar = ['.', ' ', ','];

    for (let i = 0; i < hashtags.length; i++) {
        let t = hashtags[i];
        let index = text.toLowerCase().indexOf(t.toLowerCase());

        if (index !== -1) {
            if (index == 0) {
                text = '#' + text.substr(index,1).toUpperCase() +text.substr(1) ;
            }
            else if (text.substr(index - 1, 1) != '#' && text.substr(index - 1, 1) == ' ' &&
                (authorizedEndingChar.indexOf(text.substr(index + t.length, 1)) !== -1 || text.substr(index + t.length, 1) == '')) {
                text = text.substr(0, index) + '#' + text.substr(index,1).toUpperCase() + text.substr(index + 1);
            }
        }
    }
    return text;
}

function askAuthor(user)
{
    try {

        let btnCount = Math.ceil(user.allAuthors.length / 3);
        let btnData = [];

        for (let i = 0, j = 0; i < btnCount; i++) {
            btnData.push({
                "attachment": {
                    "type": "template",
                    "payload": {
                        "template_type": "button",
                        "text": (i == 0) ? "Choisissez un auteur :" : "‎",
                        "buttons": []
                    }
                }
            });
            for (j = 0; j < 3 && user.allAuthors[(i * 3) + j]; j++) {
                let buttons = btnData[i].attachment.payload.buttons;

                buttons.push({"type": "postback", "title": user.allAuthors[(i * 3) + j], "payload": (i * 3) + j});
            }
        }
        let index = 0;
        let indexLimit = btnData.length - 1;

        createBtn(user, btnData, index, indexLimit, createBtn);

    } catch(error){
        console.log('[12] ' + error);
    }
}

function showPostInfo(user)
{
    try {

        let showInfoText = [
            {text: rewardsInsightOk[getRandom(0, rewardsInsightOk.length)] + " Voici les informations de votre post :"},
            {text: user.title},
            {text: user.descLong},
            {
                attachment: {
                    type: "image",
                    payload: {
                        url: kuratorUrl + user.image
                    }
                }
            }
        ];
        let index = 0;
        let indexLimit = showInfoText.length - 1;
    
        sendTextMessage(user, showInfoText, index, indexLimit, sendTextMessage);

    } catch(error){
        console.log('[11] ' + error);
    }
}

function askTime(user)
{
    try {

        const btnData = {
            "attachment": {
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
            }
        };

        createBtn(user, btnData);

    } catch(error){
        console.log('[12] ' + error);
    }
}

function getSelectedAuthor(user, event)
{
    try {

        let payload = event.postback.payload;

        if (user.platform != 'wordpress' || typeof(user.allAuthorsId[parseInt(payload, 10)]) == "undefined") {
            return;
        }

        user.author = user.allAuthorsId[parseInt(payload, 10)];
        user.step = user.step.getNextStep('getSelectedTime');
        
        if (user.tmpContentSelected == 0) {
            showPostInfo(user);
            return;
        }
        askTime(user);

    } catch(error){
        console.log('[13] ' + error);
    }
}

function getSelectedTime(user, event)
{
    try {

        console.log('GET SELECTED TIME');

        let payload = event.postback.payload;
        user.time = payload;

        if (user.time == "stop") {
            sendTextMessage(user, {text: "Ok, la publication est annulée."});
            delete allUsers[user.sender];
            return;
        }

        let postInfos = {
            extern_id: user.sender,
            title: user.title,
            description: user.desc,
            image: user.image,
            link: user.articleUrl,
            categories: [user.categorie],
            author: user.author,
            userDesc: user.descLong,
            time: user.time
        };

        if (user.tmpContentSelected == 1 && user.tmpContent !== "") {
            postInfos.contentId = user.tmpContent.id;
        }

        posteriaRequest('/api/addArticlesChatBot', postInfos, function(err, res, body) {
            console.log('BODY RESP', body);
            try {

                body = JSON.parse(body);
                let sender = parseInt(body.sender);

                if (body.hasError == false) {
                    sendTextMessage(allUsers[sender], [{text: rewardsPublishOk[getRandom(0, rewardsPublishOk.length)]}], 0, 1, function() {
                        delete allUsers[sender].step;
                        allUsers[sender].step = createStepTree();
                    });
                    return; 
                }
                console.log('ERROR ON BODY RESP', body.error);
                sendTextMessage(allUsers[sender], {text: body.error}); 
                delete allUsers[sender];
            }
            catch (error) {
                console.log('[2] ' + error);
                console.log("Une erreur s'est produite lors de l'enregistrement de l'article");
            } 
        });

    } catch(error){
        delete allUsers[user.sender];
    }
}

function posteriaRequest(uri, param, callback)
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

function sendTextMessage(user, msgData, index, indexLimit, callback)
{
    try {

        request({
            url: 'https://graph.facebook.com/v2.6/me/messages',
            qs: {access_token: VERIFY_TOKEN},
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
                console.log('Text message Error: ', response.body.error);
                console.log('msgData', msgData[index]);
            }
    
            if (callback != undefined && index < indexLimit) {
                callback(user, msgData, index + 1, indexLimit, callback);
            }
            else if ((user.platform == 'wall' || user.author.length != 0) && index >= indexLimit) {
                askTime(user);
            }
        });

    } catch(error){
        console.log('[14] ' + error);
    }
}

function createQuickReply(user, message, quickReplies) {
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token: VERIFY_TOKEN},
        method: 'POST',
        json: {
            recipient: {id: user.sender},
            message: {
                "text" : message,
                "quick_replies" : quickReplies
            }
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error quick reply: ', error);
        }
        else if (response.body.error) {
            console.log('[5] Error: ', response.body.error);
        }
    });
}

function createBtn(user, btnData, index, indexLimit, callback) {
    console.log('CREATE BTN');
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token: VERIFY_TOKEN},
        method: 'POST',
        json: {
            recipient: {id: user.sender},
            message: (index != undefined) ? btnData[index] : btnData
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending message: ', error);
        }
        else if (response.body.error) {
            console.log('Button Error: ', response.body.error);
        }

        if (callback != undefined && index < indexLimit) {
            callback(user, btnData, index + 1, indexLimit, callback);
        }
    });
}