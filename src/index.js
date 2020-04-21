const p = document.createElement('p');
document.body.append(p);

const recognition = new webkitSpeechRecognition();
recognition.continuous = true;
recognition.interimResults = true;

recognition.onresult = function (event) {
  for (let i = event.resultIndex; i < event.results.length; i += 1) {
    if (event.results[i].isFinal) {
      p.textContent += event.results[i][0].transcript;
    }
  }
};

recognition.start();
