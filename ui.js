$(async function() {
  // cache some selectors we'll be using quite a bit
  const $allStoriesList = $("#all-articles-list");
  const $submitForm = $("#submit-form");
  const $filteredArticles = $("#filtered-articles");
  const $favoritedArticles = $("#favorited-articles")
  const $loginForm = $("#login-form");
  const $createAccountForm = $("#create-account-form");
  const $ownStories = $("#my-articles");
  const $navLogin = $("#nav-login");
  const $navLogOut = $("#nav-logout");
  const $navCreate = $('#create-new-story')
  const $navFavorites = $('#favorite-stories')
  const $navMyStories = $('#created-stories')

  // global storyList variable
  let storyList = null;

  // global currentUser variable
  let currentUser = null;

  await checkIfLoggedIn();

  /**
   * Event listener for logging in.
   *  If successfully we will setup the user instance
   */

  $loginForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page-refresh on submit

    // grab the username and password
    const username = $("#login-username").val();
    const password = $("#login-password").val();

    // call the login static method to build a user instance
    const userInstance = await User.login(username, password);
    // set the global user to the user instance
    currentUser = userInstance;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Event listener for signing up.
   *  If successfully we will setup a new user instance
   */

  $createAccountForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page refresh

    // grab the required fields
    let name = $("#create-account-name").val();
    let username = $("#create-account-username").val();
    let password = $("#create-account-password").val();

    // call the create method, which calls the API and then builds a new user instance
    const newUser = await User.create(username, password, name);
    currentUser = newUser;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

/**
   * Event listener for submitting a new story.
   */
  $submitForm.on('submit', async function(evt){
    evt.preventDefault(); // no page refresh

    // grab the required fields
    let author = $('#author').val();
    let title = $('#title').val();
    let url = $('#url').val();
    // create object for addStory function
    let storyObj = {
      author, 
      title,
      url
    }
    // call the add method, which sends story data to the API and 
    //then builds a new story instance from the response
    let newStory = await StoryList.addStory(currentUser, storyObj)
    //add story to the DOM
    const result = generateStoryHTML(newStory);
    $allStoriesList.prepend(result);
    //update global storyList variable
    storyList.stories.push(newStory)
    //reset form
    author = ""
    title = ""
    url = ""

    $submitForm.slideToggle();
  })


  /**
   * Log Out Functionality
   * 
   */

  $navLogOut.on("click", function() {
    // empty out local storage
    localStorage.clear();
    // refresh the page, clearing memory
    location.reload();
  });

  /**
   * Event Handler for Clicking Login
   */

  $navLogin.on("click", function() {
    // Show the Login and Create Account Forms
    $loginForm.slideToggle();
    $createAccountForm.slideToggle();
    $allStoriesList.toggle();
  });

  /**
   * Event handler for Navigation to Homepage
   */

  $("body").on("click", "#nav-all", async function() {
    hideElements();
    await generateStories();
    $allStoriesList.show();
  });
  /**
   * Event handler for displaying add story form
   */
  $navCreate.on('click', function(){
    $submitForm.slideToggle();
  })

  $navFavorites.on('click', function(){
    $allStoriesList.hide()
    $favoritedArticles.show()
    console.log(currentUser)
  })

  
  $allStoriesList.on('click', 'i', async function(evt){
    // change star color
    $(evt.target).toggleClass('far').toggleClass('fas');

    // select story ID
    const favId = $(evt.target).parent().attr('id');
    //const favStory = storyList.stories.find(val => val.storyId === favId);
    
    const check = currentUser.favorites.some(userStory => 
      favId === userStory.storyId)

    if (check){
     const response = await User.removeFavorite(currentUser, favId)
     console.log(response)
     console.log($(`#${favId}`))
     console.log(currentUser)
    }

    // update the user API with new favorite
    else {

    const userFavorites = await User.addFavorite(currentUser, favId)
    }
    //TODO update current user and add/remove stoires to current favorite page
    //add to favorites page
    
   //const result = generateStoryHTML(userFavorites[userFavorites.length-1])
   //favoritedArticles.append(result)

    ////add to current user
    //currentUser.favorites.push(favStory)
    //syncCurrentUserToLocalStorage();
    //console.log(currentUser)
  })

  /**
   * On page load, checks local storage to see if the user is already logged in.
   * Renders page information accordingly.
   */
  async function checkIfLoggedIn() {
    // let's see if we're logged in
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");
    const favorites = JSON.parse(localStorage.getItem("favorites"))

    // if there is a token in localStorage, call User.getLoggedInUser
    //  to get an instance of User with the right details
    //  this is designed to run once, on page load
    currentUser = await User.getLoggedInUser(token, username);
    await generateStories();

    if (currentUser) {
      showNavForLoggedInUser();
    }
  }

  /**
   * A rendering function to run to reset the forms and hide the login info
   */

  function loginAndSubmitForm() {
    // hide the forms for logging in and signing up
    $loginForm.hide();
    $createAccountForm.hide();

    // reset those forms
    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");

    // show the stories
    $allStoriesList.show();

    // update the navigation bar
    showNavForLoggedInUser();
  }

  /**
   * A rendering function to call the StoryList.getStories static method,
   *  which will generate a storyListInstance. Then render it.
   */

  async function generateStories() {
    // get an instance of StoryList
    const storyListInstance = await StoryList.getStories();
    // update our global variable
    storyList = storyListInstance;
    // empty out that part of the page
    $allStoriesList.empty();
    $favoritedArticles.empty();


    //
   if (currentUser.favorites){
      for (let story of currentUser.favorites){
        const storyLi = generateStoryHTML(story)
        updateStars(storyLi)
        $favoritedArticles.append(storyLi)
    }
   }

    // loop through all of our stories and generate HTML for them
    for (let story of storyList.stories) {
      const storyLi = generateStoryHTML(story);
      
      if (currentUser.favorites){
        updateStars(storyLi)
      }
      $allStoriesList.append(storyLi);
    }
  }


    //show favorite stories as a filled in star
  function updateStars(storyLi){
    if (checkUserId(storyLi)){
       storyLi.children(":first").addClass('fas').removeClass('far')
     }
  }

  function checkUserId(storyLi){
    return currentUser.favorites.some(userStory => 
      storyLi.attr('id') === userStory.storyId)
  }
  /**
   * A function to render HTML for an individual Story instance
   */

  function generateStoryHTML(story) {
    let hostName = getHostName(story.url);

    // render story markup
    const storyMarkup = $(`
      <li id="${story.storyId}">
        <i class="far fa-star star"></i>
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);

    return storyMarkup;
  }

  /* hide all elements in elementsArr */

  function hideElements() {
    const elementsArr = [
      $submitForm,
      $allStoriesList,
      $filteredArticles,
      $ownStories,
      $loginForm,
      $createAccountForm
    ];
    elementsArr.forEach($elem => $elem.hide());
  }

  function showNavForLoggedInUser() {
    $navLogin.hide();
    $navLogOut.show();
    $navCreate.show();
    $navFavorites.show();
    $navMyStories.show();
  }

  /* simple function to pull the hostname from a URL */

  function getHostName(url) {
    let hostName;
    if (url.indexOf("://") > -1) {
      hostName = url.split("/")[2];
    } else {
      hostName = url.split("/")[0];
    }
    if (hostName.slice(0, 4) === "www.") {
      hostName = hostName.slice(4);
    }
    return hostName;
  }

  /* sync current user information to localStorage */

  function syncCurrentUserToLocalStorage() {
    if (currentUser) {
      localStorage.setItem("token", currentUser.loginToken);
      localStorage.setItem("username", currentUser.username);
      localStorage.setItem("favorites", JSON.stringify(currentUser.favorites));
    }
  }
});
