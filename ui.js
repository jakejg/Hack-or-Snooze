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
  const $navProfile = $('#nav-user-profile')
  const $navWelcome = $('#nav-welcome')
  const $userProfile = $('#user-profile')

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
  
    //update currentUser 
    currentUser.ownStories.push(newStory)
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

  $navProfile.on("click", function(){
    $userProfile.show();
    $allStoriesList.hide();
    $favoritedArticles.show();
    $ownStories.hide();
  })

  /**
   * Event handler for Navigation to Homepage
   */

  $("body").on("click", "#nav-all", async function() {
    hideElements();
    await generateStories();
    $allStoriesList.show();
    $favoritedArticles.hide()
    $userProfile.hide();
  });
  /**
   * Event handler for displaying add story form
   */
  $navCreate.on('click', function(){
    $submitForm.slideToggle();
  })

  /**
   * Event handler for Favorites page
   */
  $navFavorites.on('click', async function(){
    $allStoriesList.hide();
    $favoritedArticles.show();
    $ownStories.hide();
    $userProfile.hide();

   if (currentUser){
    $favoritedArticles.empty();
    addToPage(currentUser.favorites, $favoritedArticles)
   }
  })
/**
   * Event handler for My Stories page
   */
  $navMyStories.on('click', async function(){
    $allStoriesList.hide();
    $ownStories.show();
    $favoritedArticles.hide();
    $userProfile.hide();

    //add stories to the page
    if (currentUser){
      $ownStories.empty();
      addToPage(currentUser.ownStories, $ownStories)
    
    // add trash icon
      for (li of $ownStories.children()){
        const $trash = $(`<i class="far fa-trash-alt"></i>`)
        $trash.prependTo(li)
      }
    }
  })
/**
   * Event handler for trash icon 
   */

  $ownStories.on('click', 'i', async function(evt){
    if ($(evt.target).hasClass('far fa-trash-alt')){

      //get storyId
      const storyId = $(evt.target).parent().attr('id');

      //remove story from API
      await StoryList.deleteStory(currentUser, storyId)

      //update currentUser
      const ownIndex = currentUser.ownStories.findIndex(id => storyId === id)
      const favIndex = currentUser.favorites.findIndex(id => storyId === id)
      currentUser.ownStories.splice(ownIndex, 1)
      currentUser.favorites.splice(favIndex, 1)

   
      //remove from DOM
      $(evt.target).parent().remove()
   }
  })


  
  $allStoriesList.on('click', 'i', async function(evt){
    // change star color
    $(evt.target).toggleClass('far').toggleClass('fas');

    // select story ID
    const favId = $(evt.target).parent().attr('id');
    //check if the story is a favorite already
    const check = currentUser.favorites.some(userStory => 
      favId === userStory.storyId)

      // update the user API and currentUser with new favorites
    if (check){
     const userFavoritesMinus1 = await User.removeFavorite(currentUser, favId)
     currentUser.favorites = userFavoritesMinus1
    }

    // update the user API and currentUser with new favorites
    else {
      const userFavoritesPlus1 = await User.addFavorite(currentUser, favId)
      currentUser.favorites = userFavoritesPlus1
    }
    
  })

  /**
   * On page load, checks local storage to see if the user is already logged in.
   * Renders page information accordingly.
   */
  async function checkIfLoggedIn() {
    // let's see if we're logged in
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    // if there is a token in localStorage, call User.getLoggedInUser
    //  to get an instance of User with the right details
    //  this is designed to run once, on page load
    currentUser = await User.getLoggedInUser(token, username);
    await generateStories();

    if (currentUser) {
      showNavForLoggedInUser();
      generateProfile();
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
    $navProfile.text(currentUser.name)
    $navWelcome.show()

    
    generateStories();

    // show the stories
    $allStoriesList.show();

    // update the navigation bar
    showNavForLoggedInUser();
    generateProfile()
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
    console.log(currentUser)

    // loop through all of our stories and generate HTML for them
    for (let story of storyList.stories) {
      const storyLi = generateStoryHTML(story);
      
      if (currentUser){
        updateStars(storyLi)
      }
      $allStoriesList.append(storyLi);
    }
  }

  // add stories to a new page
  function addToPage(userArray, newPage){
    for (let story of userArray){
      const storyLi = generateStoryHTML(story)
      updateStars(storyLi)
      newPage.append(storyLi)
    }
  }


    //show favorite stories as a filled in star
  function updateStars(storyLi){
    if (checkUserId(storyLi)){
       storyLi.children(":first").addClass('fas').removeClass('far')
     }
  }
  // check if story ID matches user ID
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

  function generateProfile(){
    $('#profile-name').text(`Name: ${currentUser.name}`)
    $('#profile-username').text(`Username: ${currentUser.username}`)
    $('#profile-account-date').text(`Account Created: ${currentUser.createdAt}`)

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
    $navProfile.text(currentUser.name)
    $navWelcome.show()
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
    }
  }
});
