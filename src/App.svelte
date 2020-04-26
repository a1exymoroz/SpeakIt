<script>
  let firstPicture = './assets/blank.jpg';
  let imgSrc = firstPicture;
  let words = [];
  let wordTranslate = '';
  let speakResult = '';
  let isRecognizing = false;
  let isResultOpen = false;
  let pageRequest = 0;
  let groupRequest = 0;
  let pageRequestNumbers = [0, 1, 2, 3, 4, 5];

  const recognition = new webkitSpeechRecognition();
  recognition.continuous = true;
  const checkWord = (word) => {
    const index = words.findIndex((element) => element.word === word);
    if (index !== -1) {
      imgSrc = words[index].image;
      words[index].active = true;
    }
    if (words.every((element) => element.active)) {
      onShowResults();
    }
  };

  recognition.onresult = function (event) {
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      if (event.results[i].isFinal) {
        speakResult = event.results[i][0].transcript.trim();
        checkWord(speakResult);
      }
    }
  };

  const setWords = async (page, group) => {
    const url = `https://afternoon-falls-25894.herokuapp.com/words?page=${page}&group=${group}`;
    const res = await fetch(url);
    const json = await res.json();
    const dataUrl = 'https://raw.githubusercontent.com/a1exymoroz/rslang-data/master/data/';

    words = json.map((element) => {
      const imageSrc = element.image.split('/');
      return {
        word: element.word,
        image: dataUrl + imageSrc[imageSrc.length - 1],
        active: false,
        transcription: element.transcription,
      };
    });
  };

  const getTranslate = async (word) => {
    const API_KEY =
      'trnsl.1.1.20170506T133756Z.d523dbf15945aee5.28e6bba8287e893a63b6e59990a007a82116e5e1';
    const url = `https://translate.yandex.net/api/v1.5/tr.json/translate?key=${API_KEY}&text=${word}&lang=en-ru`;
    const res = await fetch(url);
    const data = await res.json();
    return data.text[0];
  };

  const resetActiveWords = () => {
    words = words.map((element) => {
      element.active = false;
      return element;
    });
  };

  const onClickWord = async (data) => {
    if (isRecognizing) {
      return;
    }
    const synth = window.speechSynthesis;
    synth.speak(new SpeechSynthesisUtterance(data.word));
    if (!isResultOpen) {
      imgSrc = data.image;
      wordTranslate = await getTranslate(data.word);
    }
  };

  const resetData = () => {
    resetRecognition();
    resetActiveWords();
    imgSrc = firstPicture;
  };

  const onStartRecognition = () => {
    recognition.start();
    isRecognizing = true;
    imgSrc = firstPicture;
  };

  const resetRecognition = () => {
    recognition.stop();
    isRecognizing = false;
    speakResult = '';
    wordTranslate = '';
  };

  const onResetRecognition = () => {
    resetData();
  };

  const onShowResults = () => {
    resetRecognition();
    isResultOpen = true;
    document.body.style.overflow = 'hidden';
  };

  const onClickLevelOfWords = (number) => {
    resetData();
    pageRequest = number;
    setWords(pageRequest, groupRequest);
  };

  const onNewGameStart = () => {
    isResultOpen = false;
    resetData();
    groupRequest++;
    setWords(pageRequest, groupRequest);
    document.body.style.overflow = 'auto';
  };

  const onClickReturn = () => {
    isResultOpen = false;
    document.body.style.overflow = 'auto';
  };

  setWords(pageRequest, groupRequest);

  $: correctAnswers = words.filter((element) => element.active);
  $: wrongAnswers = words.filter((element) => !element.active);
</script>

{#if isResultOpen}
<div class="result__wrapper">
  <div class="result__blocks">
    <h3>&#9989; Correct</h3>
    {#if !correctAnswers.length}
    <p>Empty</p>
    {/if}
    <ul>
      {#each correctAnswers as correctAnswer}
      <li on:click="{onClickWord(correctAnswer)}">
        <span>&#128266;</span>
        <span>{correctAnswer.word}</span>
        <span>{correctAnswer.transcription}</span>
        {#await getTranslate(correctAnswer.word)}
        <!-- promise is pending -->
        <span>waiting...</span>
        {:then value}
        <!-- promise was fulfilled -->
        <span>{value}</span>
        {:catch error}
        <!-- promise was rejected -->
        <span>Something went wrong: {error.message}</span>
        {/await}
      </li>
      {/each}
    </ul>
  </div>

  <div class="result__blocks">
    <h3>&#10060; Wrong</h3>
    {#if !wrongAnswers.length}
    <p>Empty</p>
    {/if}
    <ul>
      {#each wrongAnswers as wrongAnswer}
      <li on:click="{onClickWord(wrongAnswer)}">
        <span>&#128266;</span>
        <span>{wrongAnswer.word}</span>
        <span>{wrongAnswer.transcription}</span>
        {#await getTranslate(wrongAnswer.word)}
        <!-- promise is pending -->
        <span>waiting...</span>
        {:then value}
        <!-- promise was fulfilled -->
        <span>{value}</span>
        {:catch error}
        <!-- promise was rejected -->
        <span>Something went wrong: {error.message}</span>
        {/await}
      </li>
      {/each}
    </ul>
  </div>

  <div>
    <button class="myButton" on:click="{() => onClickReturn()}">Return</button>
    <button class="myButton" on:click="{() => onNewGameStart()}">New game</button>
  </div>
</div>
{/if}

<header>
  <div class="cntr">
    {#each pageRequestNumbers as pageRequestNumber}
    <label for="{'rdo-' + pageRequestNumber}" class="btn-radio">
      <input
        type="radio"
        id="{'rdo-' + pageRequestNumber}"
        name="radio-grp"
        checked="{pageRequestNumber === pageRequest}"
        on:click="{() => onClickLevelOfWords(pageRequestNumber)}"
      />
      <svg width="20px" height="20px" viewBox="0 0 20 20">
        <circle cx="10" cy="10" r="9"></circle>
        <path
          d="M10,7 C8.34314575,7 7,8.34314575 7,10 C7,11.6568542 8.34314575,13 10,13 C11.6568542,13 13,11.6568542 13,10 C13,8.34314575 11.6568542,7 10,7 Z"
          class="inner"
        ></path>
        <path
          d="M10,1 L10,1 L10,1 C14.9705627,1 19,5.02943725 19,10 L19,10 L19,10 C19,14.9705627 14.9705627,19 10,19 L10,19 L10,19 C5.02943725,19 1,14.9705627 1,10 L1,10 L1,10 C1,5.02943725 5.02943725,1 10,1 L10,1 Z"
          class="outer"
        ></path>
      </svg>
      <span>{pageRequestNumber} level</span>
    </label>
    {/each}
  </div>
</header>
<main>
  <div class="main__pic-text">
    <img src="{imgSrc}" alt="Word picture" />
    <div class="main__text">
      {#if wordTranslate && !isRecognizing}
      <span>{wordTranslate}</span>
      {/if} {#if isRecognizing}
      <span>{speakResult}</span>
      {/if}
    </div>
  </div>
  <ul class="main__words">
    {#each words as word}
    <li class="main_word" on:click="{onClickWord(word)}" class:active="{word.active}">
      <span>&#128266;</span>
      <div class="main_word-text">
        <p>{word.word}</p>
        <p>{word.transcription}</p>
      </div>
    </li>
    {/each}
  </ul>
</main>

<footer>
  <button class="myButton" on:click="{onResetRecognition}">Restart</button>
  <button class="myButton" on:click="{onStartRecognition}">Speak please</button>
  <button class="myButton" on:click="{onShowResults}">Results</button>
</footer>

<style lang="scss">
  @import './style.scss';
</style>
