/*
  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
  SPDX-License-Identifier: MIT-0 
*/

//timeout in seconds
// let seconds_timeout = 3600;

import {
  CognitoUserPool,
  // CognitoUser,
  // AuthenticationDetails,
} from "amazon-cognito-identity-js";

//imports userpool data from config
import { POOL_DATA } from "../../config/cognito";

// //imports localStorage utility methods
// import { updateLocalStorageData } from "../../utils/localStorage";

export default {
  setIDToken(context, payload) {
    context.commit("setIDToken", payload);
  },
  setAccessToken(context, payload) {
    context.commit("setAccessToken", payload);
  },
  setUsername(context, payload) {
    context.commit("setUsername", payload);
  },
  setIsAuthenticated(context, payload) {
    context.commit("setIsAuthenticated", payload);
  },
  setEmail(context, payload) {
    context.commit("setEmail", payload);
  },
  setSession(context, payload) {
    context.commit("setSession", payload);
  },

  // async signin(context, payload) {
  //   //sets up Cognito User pool data
  //   const userPool = new CognitoUserPool(POOL_DATA);

  //   //gets up Cognito authentication data from state
  //   const authData = {
  //     Username: payload.username,
  //     Password: payload.password,
  //   };

  //   //sets up authentication details
  //   const authDetails = new AuthenticationDetails(authData);
  //   const userData = {
  //     Username: authData.Username,
  //     Pool: userPool,
  //   };

  //   // creates a Cognito User object based on user auth details and user pool info
  //   const cognitoUser = new CognitoUser(userData);

  //   //calls the authenticate user method
  //   await cognitoUser.authenticateUser(authDetails, {
  //     onSuccess(result) {
  //       console.log(result);

  //       // sets user login to expire after 1 hour
  //       const expirationDate =
  //         +result.idToken.payload["auth_time"] + seconds_timeout;
  //       console.log(
  //         "Auth Time " + +result.idToken.payload["auth_time"],
  //         " Expire Date " + expirationDate
  //       );
  //       var expires_millseconds =
  //         (expirationDate - +result.idToken.payload["auth_time"]) * 1000;
  //       console.log("Expires in milliseconds ", expires_millseconds);

  //       // remove
  //       // creating user data object that will be stored in Vuex state
  //       // const userData = {
  //       //   idToken: result.idToken.jwtToken,
  //       //   email: result.idToken.payload["email"],
  //       //   cognitoSub: result.idToken.payload["sub"],
  //       //   cognitoUserName: result.idToken.payload["cognito:username"],
  //       //   refreshToken: result.refreshToken.token,
  //       //   accessToken: result.accessToken.jwtToken,
  //       //   tokenExpiration: expirationDate,
  //       // };

  //       // // writes user data to localStorage
  //       // updateLocalStorageData(userData, "set");
  //       // end remove

  //       // starts timer to auto logout after 1 hour
  //       setTimeout(function() {
  //         context.dispatch("autoLogout");
  //         console.log("auto logging out");
  //       }, expires_millseconds);

  //       // writes user data to Vuex state
  //       context.commit("setUser", userData);
  //     },
  //     onFailure(err) {
  //       const error = new Error(
  //         err.message || "Failed to sign up. Try again later."
  //       );

  //       console.log(err);

  //       throw error;
  //     },
  //   });
  // },
  logout(context) {
    console.log("log out called");

    // gets reference to the Cognito user pool
    const userPool = new CognitoUserPool(POOL_DATA);

    //gets current logged in user
    const cognitoUser = userPool.getCurrentUser();

    localStorage.clear();

    cognitoUser.signOut();

    context.commit("logout");
  },
  tryLogin(payload) {
    console.log(payload);
  },
  autoLogout(context) {
    context.dispatch("logout");
    context.commit("setAutoLogout");
  },
};
