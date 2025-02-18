<!-- 
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: MIT-0 
-->
<template>
  <div class="container">
    <div v-bind:class="{ 'col-4 offset-md-4': isLargeScreen }">
      <base-message :type="messageStyleType" v-if="message">{{
        message
      }}</base-message>
      <base-card>
        <template v-slot:title>
          <i class="bi bi-gear me-1"></i> Settings
        </template>
        <template v-slot:body>
          <div class="row">
            <div class="col-12 text-start">
              <div>
                <div class="row">
                  <div class="row" v-if="!showQRCode">
                    <div class="col-4">Enabled MFA</div>
                    <div class="col-6">
                      <input
                        type="checkbox"
                        :value="mfaValue"
                        v-model="mfaValue"
                        @change="newQRCode($event)"
                      />
                    </div>
                  </div>
                  <div v-if="showQRCode" class="mb-3 text-center">
                    <div class="text-center">
                      Scan QR Code using an authenticator app that supports Time-based One-Time Password (TOTP)
                    </div>
                    <div class="mt-3">
                      <qrcode-vue
                        :value="qrData"
                        :size="200"
                        level="H"
                      ></qrcode-vue>
                    </div>
                  </div>
                  <hr />
                  <div v-if="showQRCode" class="mt-1 text-center">
                    <p>Enter MFA Code</p>
                    <div class="row text-center">
                      <div class="col-4 offset-md-4 mb-2">
                        <div class="input-group">
                          <input
                            type="text"
                            v-model="qrCode"
                            class="form-control form-control-sm"
                            maxlength="6"
                            required
                          />
                        </div>
                      </div>
                    </div>
                    <button class="btn btn-danger mt-2 me-2" @click="cancel">
                      Cancel
                    </button>
                    <button class="btn btn-success mt-2 " @click="verifyMFA">
                      Confirm MFA Setup
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </base-card>
    </div>
  </div>
</template>

<script>
import { ref, computed, onBeforeMount, onBeforeUpdate } from "vue";
import { useStore } from "vuex";
import QrcodeVue from "qrcode.vue";
import { CognitoUserPool } from "amazon-cognito-identity-js";
import useAlert from "../../hooks/alert";

// imports userpool data from config
import { POOL_DATA } from "../../config/cognito";

export default {
  components: {
    QrcodeVue,
  },
  setup() {
    // create a reference to Vuex store
    const store = useStore();

    const isEnabled = ref(false);
    const qrData = ref("");
    const showQRCode = ref(false);
    const qrCode = ref("");

    //sets up hook for message alerting
    const { message, messageStyleType, setMessage } = useAlert();

    /* 
      FOR TESTING - method call for manually disabling MFA for currently logged in user 
      when the MFA Setting page loads
      setMFA(false);
    */

    //checks to see the current state of mFA for logged in user
    onBeforeMount(function() {
      store.dispatch("fetchMFAValue");
    });

    onBeforeUpdate(function() {
      store.dispatch("fetchMFAValue");
    });

    function newQRCode() {
      //disables MFA when unchecking "Enable MFA"
      if (mfaValue.value === true) {
        setMFA(false);
        setMessage(
          "MFA has successfully been disabled for your account.",
          "alert-success"
        );
        return;
      }

      showQRCode.value = true;

      //associate Software token code starts here
      //gets reference to the Cognito user pool
      const userPool = new CognitoUserPool(POOL_DATA);
      
      //gets current logged in user
      const cognitoUser = userPool.getCurrentUser();
      cognitoUser.setSignInUserSession(store.getters.session);
      
      //creates the image data for QR Code that the user will scan
      cognitoUser.associateSoftwareToken({
        onSuccess: function(result) {
          console.log(result);
        },
        associateSecretCode: function(secretCode) {
          qrData.value =
            "otpauth://totp/CognitoMFA:" +
            store.getters.email +
            "?secret=" +
            secretCode +
            "&issuer=CognitoJSPOC";
        },
        onFailure: function(err) {
          console.log(err);
          setMessage("There was a problem generating MFA QR Code.", "alert-danger");
        },
      });
      // associate Software token code end here
    }

    function verifyMFA() {
      console.log("Assoicating MFA");
      //verify Software token code starts here
      // gets reference to the Cognito user pool
      const userPool = new CognitoUserPool(POOL_DATA);
      
      //gets current logged in user
      const cognitoUser = userPool.getCurrentUser();
      cognitoUser.setSignInUserSession(store.getters.session);
      
      //verifies the MFA Code and links the Software Token to the users profile
      cognitoUser.verifySoftwareToken(qrCode.value, "SoftwareToken", {
        onSuccess: function(result) {
          console.log(result);
      
          setMFA(true);
          setMessage(
            "MFA has successfully been setup for your account.",
            "alert-success"
          );
          showQRCode.value = false;
        },
        onFailure: function(err) {
          console.log(err);
          setMessage(
            err.message || "There was a problem confirming MFA Code.",
            "alert-danger"
          );
        },
      });
      //verify Software token code ends here
    }

    // method that enables or disables MFA for a users account
    function setMFA(isEnabled) {
      //verify Software token code starts here
      // gets reference to the Cognito user pool
      const userPool = new CognitoUserPool(POOL_DATA);
      
      //gets current logged in user and sets the session
      const cognitoUser = userPool.getCurrentUser();
      cognitoUser.setSignInUserSession(store.getters.session);
      
      const totpMfaSettings = {
        PreferredMfa: isEnabled,
        Enabled: isEnabled,
      };
      
      //sets a users MFA preference
      cognitoUser.setUserMfaPreference(null, totpMfaSettings, function(err, result) {
        if (err) {
          console.log(err);
        }
      
        store.dispatch("setMFA", isEnabled);
        console.log("setUserMfaPreference call result " + result);
      });
      //verify Software token code ends here
    }

    //computed property that stores whether MFA is enable or disabled for user
    const mfaValue = computed(() => {
      console.log(`MFA enabled - ${store.getters.isMFAEnabled}`);
      return store.getters.isMFAEnabled;
    });

    function cancel() {
      showQRCode.value = false;
      setMessage("MFA setup cancelled", "alert-success");
    }

    return {
      isEnabled,
      setMFA,
      mfaValue,
      qrData,
      newQRCode,
      showQRCode,
      qrCode,
      verifyMFA,
      cancel,
      message,
      messageStyleType,
      setMessage,
    };
  },
  data(){
    return {
        isLargeScreen: window.innerWidth >= 800
      }
  },
  created(){
    addEventListener('resize', () => {
      this.isLargeScreen = innerWidth >= 800
    })
  }
};
</script>

<style></style>
