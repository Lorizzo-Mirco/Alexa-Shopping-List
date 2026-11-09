const Alexa = require('ask-sdk-core');
require('dotenv').config();

let api;
const maxNoOfItemsReported = 5;

if (process.env.BACKEND === 'hass') {
  const HomeAssistant = require('./backends/home-assistant');
  api = new HomeAssistant();
} else {
  const ToDoList = require('./backends/to-do-list');
  api = new ToDoList();
}

let wasOpened = false;

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest'
    );
  },
  handle(handlerInput) {
    wasOpened = true;
    const speakOutput = 'Questa è la tua lista della spesa. Cosa vuoi fare?';
    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .getResponse();
  },
};

const AddItemIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'AddItemIntent'
    );
  },
  async handle(handlerInput) {
    // Contenitore della risposta
    let speakOutput;

    // Recupera il nome dell'articolo dalla richiesta
    let item = Alexa.getSlotValue(handlerInput.requestEnvelope, 'item');
    if (!item) {
      speakOutput = 'Non ho capito quale articolo aggiungere.';
      return handlerInput.responseBuilder
        .speak(speakOutput)
        .reprompt('Quale articolo vuoi aggiungere?')
        .getResponse();
    }
    item = item.charAt(0).toUpperCase() + item.slice(1);

    try {
      // Aggiunge l'articolo alla lista
      await api.create(item);
      speakOutput = `Ho aggiunto ${item} alla lista della spesa.`;
      speakOutput += wasOpened ? ' Vuoi aggiungere altro?' : '';
    } catch (err) {
      speakOutput = 'Si è verificato un problema durante l\'aggiunta dell\'articolo.';
      console.error("Errore durante l'aggiunta dell'articolo");
      console.error(err);
    }

    // Prepara il generatore della risposta
    let rb = handlerInput.responseBuilder.speak(speakOutput);

    // Chiede se l'utente vuole aggiungere altro dopo l'apertura della skill
    if (wasOpened) {
      rb = rb.reprompt('Vuoi aggiungere altro?');
    }

    return rb.getResponse();
  },
};

const ListItemsIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'ListItemsIntent'
    );
  },
  async handle(handlerInput) {
    // Risposta predefinita
    let speakOutput;

    try {
      // Recupera tutti gli articoli
      const items = await api.list();
      const totalItemsAmount = items.length;

      const itemsToReportAmount =
          totalItemsAmount < maxNoOfItemsReported
              ? totalItemsAmount : maxNoOfItemsReported;
      const itemsToReport = items.slice(0, itemsToReportAmount).map((item) => item.name);

        // Costruisce la risposta
      if (totalItemsAmount === 0) {
        // La lista è vuota
        speakOutput = 'La lista della spesa è vuota.';
      } else if (totalItemsAmount === 1) {
        // La lista contiene un articolo
        speakOutput = `C'è un articolo nella tua lista: ${itemsToReport[0]}`;
      } else {
        const itemsListed = itemsToReport.slice(0, -1).join(', ') + ' e ' + itemsToReport.slice(-1);
        if (totalItemsAmount <= maxNoOfItemsReported) {
          // Elenca tutti gli articoli quando non viene superato il limite
          speakOutput = `Ci sono ${totalItemsAmount} articoli nella tua lista: ${itemsListed}`;
        } else {
          // Per le liste lunghe elenca solo gli ultimi articoli restituiti
          speakOutput = `Ci sono ${totalItemsAmount} articoli nella tua lista. Gli ultimi ${itemsToReportAmount} sono: ${itemsListed}`;
        }
      }
      
    } catch (err) {
      speakOutput = 'Si è verificato un problema durante il recupero della lista.';
      console.error(err);
    }

    let rb = handlerInput.responseBuilder.speak(speakOutput);

    // Chiede se l'utente vuole eseguire un'altra operazione
    if (wasOpened) {
      rb = rb.reprompt('Vuoi fare altro?');
    }

    return rb.getResponse();
  },
};

const ClearCompletedItemsIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) ===
        'ClearCompletedItemsIntent'
    );
  },
  async handle(handlerInput) {
    // Contenitore della risposta
    let speakOutput;

    try {
      // Cancella gli articoli completati
      await api.clear();
      speakOutput = 'Ho ripulito la lista.';
    } catch (err) {
      speakOutput = 'Si è verificato un problema durante la pulizia della lista.';
      console.error('Errore durante la pulizia della lista');
      console.error(err);
    }

    // Prepara il generatore della risposta
    let rb = handlerInput.responseBuilder.speak(speakOutput);

    // Chiede se l'utente vuole eseguire un'altra operazione
    if (wasOpened) {
      rb = rb.reprompt('Vuoi fare altro?');
    }

    return rb.getResponse();
  },
};

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent'
    );
  },
  handle(handlerInput) {
    const speakOutput =
      'Posso aggiungere articoli, leggere la lista o ripulire gli articoli completati.';

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .getResponse();
  },
};

const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      (Alexa.getIntentName(handlerInput.requestEnvelope) ===
        'AMAZON.CancelIntent' ||
        Alexa.getIntentName(handlerInput.requestEnvelope) ===
          'AMAZON.StopIntent' ||
        Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.NoIntent')
    );
  },
  handle(handlerInput) {
    const speakOutput = 'A presto!';
    return handlerInput.responseBuilder.speak(speakOutput).getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) ===
      'SessionEndedRequest'
    );
  },
  handle(handlerInput) {
    // Reimposta lo stato alla fine della sessione.
    wasOpened = false;
    return handlerInput.responseBuilder.getResponse();
  },
};

// Riflette l'intent ricevuto per facilitare i test del modello di interazione.
const IntentReflectorHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
    );
  },
  handle(handlerInput) {
    const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
    const speakOutput = `Hai attivato l'intent ${intentName}.`;

    return (
      handlerInput.responseBuilder
        .speak(speakOutput)
        .getResponse()
    );
  },
};

// Gestore degli errori di sintassi o di instradamento delle richieste.
const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.error(`~~~~ Error handled: ${error.stack}`);
    const speakOutput = 'Non sono riuscita a eseguire la richiesta. Riprova.';

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .getResponse();
  },
};

// SkillBuilder è il punto di ingresso della skill e instrada richieste e risposte.
exports.handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    AddItemIntentHandler,
    ListItemsIntentHandler,
    ClearCompletedItemsIntentHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler,
    IntentReflectorHandler
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();
