"use strict";

const appState = {
  points: 500,
  initialPoints: 500,
  badgeLevel: "normal",
  audioContext: null,
};

function getBadgeLevelByPoints() {
  const ratio = appState.points / appState.initialPoints;

  if (ratio <= 0.25) return "danger";
  if (ratio <= 0.5) return "warning";
  return "normal";
}

function getAudioContext() {
  if (!window.AudioContext && !window.webkitAudioContext) return null;

  if (!appState.audioContext) {
    const ContextClass = window.AudioContext || window.webkitAudioContext;
    appState.audioContext = new ContextClass();
  }

  return appState.audioContext;
}

function playBeep(frequency = 880, duration = 120) {
  const audioContext = getAudioContext();
  if (!audioContext) return;

  if (audioContext.state === "suspended") {
    audioContext.resume().catch(() => {});
  }

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  const now = audioContext.currentTime;

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, now);

  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.exponentialRampToValueAtTime(0.2, now + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration / 1000);

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.start(now);
  oscillator.stop(now + duration / 1000 + 0.01);
}

function playBeepSequence(times) {
  for (let index = 0; index < times; index += 1) {
    setTimeout(() => playBeep(), index * 180);
  }
}

function updatePointsBadgeColor() {
  const pointsBadge = document.querySelector(".chat-points");
  if (!pointsBadge) return;

  pointsBadge.classList.remove("is-warning", "is-danger");
  const nextLevel = getBadgeLevelByPoints();

  if (nextLevel === "danger") {
    pointsBadge.classList.add("is-danger");
  } else if (nextLevel === "warning") {
    pointsBadge.classList.add("is-warning");
  }

  if (nextLevel !== appState.badgeLevel) {
    if (nextLevel === "warning") {
      playBeepSequence(1);
    } else if (nextLevel === "danger") {
      playBeepSequence(3);
    }

    appState.badgeLevel = nextLevel;
  }
}

function updatePointsUI() {
  const pointsValue = document.getElementById("points-value");
  if (pointsValue) {
    pointsValue.textContent = String(appState.points);
  }

  updatePointsBadgeColor();
}

function appendMessage(text, role) {
  const messages = document.getElementById("messages");
  if (!messages) return;

  const message = document.createElement("article");
  message.className = `message ${role}`;
  message.textContent = text;
  messages.appendChild(message);
  messages.scrollTop = messages.scrollHeight;
}

function normalizeText(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getBotReply(userText) {
  const normalizedText = normalizeText(userText).trim();

  if (normalizedText.startsWith("toma nota")) {
    return `${userText} Anotado Jefe`;
  }

  if (/\bcuantos\s+puntos\s+tengo\b/.test(normalizedText)) {
    return `Tienes ${appState.points} puntos.`;
  }

  if (/\bquien\b/.test(normalizedText)) {
    const names = ["Carlos", "Ana", "Miguel", "Laura", "Jose"];
    return names[Math.floor(Math.random() * names.length)];
  }

  if (/\bque\s+es\b/.test(normalizedText)) {
    return "cualquier cosa";
  }

  return "eso no me lo se";
}

function handleSend(rawMessage) {
  const text = String(rawMessage || "").trim();
  if (!text) return;

  const messageCost = text.length;

  if (appState.points <= 0) {
    appendMessage("No te quedan puntos para enviar mensajes.", "system");
    return;
  }

  if (messageCost > appState.points) {
    appendMessage(
      `No tienes puntos suficientes. Necesitas ${messageCost} y tienes ${appState.points}.`,
      "system"
    );
    return;
  }

  appendMessage(text, "user");
  appState.points -= messageCost;
  updatePointsUI();
  appendMessage(getBotReply(text), "bot");
}

function handleBuyPoints() {
  const userInput = window.prompt("Ingresa la cantidad de puntos que deseas comprar:");
  if (userInput === null) return;

  const amount = Number.parseInt(userInput.trim(), 10);
  if (!Number.isInteger(amount) || amount <= 0) {
    appendMessage("La cantidad debe ser un numero entero mayor a 0.", "system");
    return;
  }

  appState.points += amount;
  updatePointsUI();
  appendMessage(`Se compraron ${amount} puntos.`, "system");
}

function insertWordAtCursor(input, word) {
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;
  const before = input.value.slice(0, start);
  const after = input.value.slice(end);

  const needsLeadingSpace = before.length > 0 && !before.endsWith(" ");
  const needsTrailingSpace = after.length > 0 && !after.startsWith(" ");
  const insertText = `${needsLeadingSpace ? " " : ""}${word}${needsTrailingSpace ? " " : ""}`;

  input.value = `${before}${insertText}${after}`;

  const nextCursor = before.length + insertText.length;
  input.setSelectionRange(nextCursor, nextCursor);
  input.focus();
}

function initChatLaskmit() {
  const form = document.getElementById("chat-form");
  const input = document.getElementById("message-input");
  const buyPointsButton = document.getElementById("buy-points-button");
  const helpWordsSelect = document.getElementById("help-words-select");

  updatePointsUI();
  appendMessage("Bienvenido a Chat Laskmit.", "system");

  if (!form || !input) return;

  if (buyPointsButton) {
    buyPointsButton.addEventListener("click", handleBuyPoints);
  }

  if (helpWordsSelect) {
    helpWordsSelect.addEventListener("change", () => {
      const selectedWord = helpWordsSelect.value;
      if (!selectedWord) return;

      insertWordAtCursor(input, selectedWord);
      helpWordsSelect.value = "";
    });
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    handleSend(input.value);
    input.value = "";
    input.focus();
  });
}

window.addEventListener("DOMContentLoaded", initChatLaskmit);
