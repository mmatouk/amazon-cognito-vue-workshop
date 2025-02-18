# Integrating Cognito with a web application using JavaScript SDK - Workshop


This project is a fork from the original https://github.com/aws-samples/amazon-cognito-vue-workshop, please refer to the original repository for instructions on manual deployment and steps to build this workshop from scratch.
This forked project adds few features like support for WebAuthn and Password-less authentication, adding full automation to build the dev environment and adds features to get temporary AWS credentials and demonstrates Role based and attribute based access control patterns.

### Deployment steps

![deployment steps](docs/images/deployment.gif)

#### Clone the project
```shell
 git clone https://github.com/mmatouk/amazon-cognito-vue-workshop.git
 
 cd amazon-cognito-vue-workshop
 
 npm install
```
#### Create AWS resources

To create AWS resources needed to run this application, use the command below. This command references region us-west-2, if you are creating your resources in another region, make sure you edit the command accordingly.
```shell
aws cloudformation create-stack --stack-name cognito-workshop --template-body file://aws/UserPoolTemplate.yaml --capabilities CAPABILITY_AUTO_EXPAND CAPABILITY_IAM CAPABILITY_NAMED_IAM --region us-west-2
```
This template will create several resources including (but not limited to)
- Cognito User Pool, application client and IAM roles/policies
- Lambda functions to be used for custom authentication flow and all IAM resources required for it
- Cognito Identity Pool and IAM roles/policies required for it to work properly
- API Gateway resources and sample method that uses Cognito Authorizer for authorization

To be able to test attribute-based access control, additional rules need to be defined for the identity pool to propagate certain attributes from user's token as session tags. These rules can be added from the console or using the command below:

**Note** IdentityPoolId and AuthenticationProvider values can be found in the output section of the cloudformation stack.

```shell
aws cognito-identity set-principal-tag-attribute-map --identity-pool-id [IdentityPoolId] --identity-provider-name "[AuthenticationProvider]" --no-use-defaults --principal-tags "subscription=custom:subscription,messagingEnabled=custom:messagingEnabled"  --region us-west-2
```
#### Update configuration

After creating the CloudFormation stack in previous step, you can get the configuration details required to run this demo application from the Output section of the created stack. You can view this from the console or run the command below

```shell
aws cloudformation describe-stacks --stack-name cognito-workshop --region us-west-2
 ```
Open the file src/config/cognito.js and update the configuration from values in stack outputs then save the changes

Now you can run the application, this application has two separate apps that will run on separate ports. Front-end is the web application part and this runs on port 8080, there is also a lightweight backend running at port 8081 and this is required for WebAuthn feature to work.
This backend is used to create and validate request and response passed to/from authenticator devices.

to run the frontend application use the command below

```shell
npm run serve
```
to run the backend service use the command below

```shell
node server.js
```
Front-end application is now running at port 8080 and server is running on 8081, however, to be able to use WebAuthn we need to enable HTTPS protocol for the web app and also create a rule that allows requests to /authn route to be directed to a different port (the port of the backend application)

To enable HTTPS, we will use NGINX with a self-signed certificate for demonestration purposes. Using self-signed certificate may be blocked by certain browsers, if you want a fully working PoC, you should consider using an SSL certificate that is properly issued for your domain and use Route53 to create DNS record to access your application.

#### Install and configure NGINX

NGINX installation depends on your environment, commands may be different but the configuration steps and configuration data should be the same.

###### Install NGINX
```shell
sudo yum install nginx
```

###### Create self-signed certificate to be used for HTTPS configuration
```shell
sudo mkdir /etc/ssl/private
sudo chmod 700 /etc/ssl/private
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /etc/ssl/private/nginx-selfsigned.key -out /etc/ssl/certs/nginx-selfsigned.crt
```

You will be asked series of questions to create the certificate, please follow the on-screen guidance and complete the creation of SSL certificate

###### Configure NGINX
Open nginx.conf file in test editor, if you are not sure where this file is located you can use the command nginx -t to display the properties
```shell
vi /etc/nginx/nginx.conf
```

Edit the file to include two server configurations to listed on ports 80 and 443 as below

    # HTTPS server
    #
    server {
        listen 443 http2 ssl;
        listen [::]:443 http2 ssl;

        server_name your_server_ip;

        ssl_certificate /etc/ssl/certs/nginx-selfsigned.crt;
        ssl_certificate_key /etc/ssl/private/nginx-selfsigned.key;

        ssl_session_cache    shared:SSL:1m;
        ssl_session_timeout  5m;

        ssl_ciphers  HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers  on;

        location / {
            proxy_pass https://localhost:8080;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }

        location /authn/ {
                proxy_pass         http://localhost:8081;
                proxy_redirect     off;
                proxy_set_header   Host $host;
                proxy_set_header   X-Real-IP $remote_addr;
                proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_set_header   X-Forwarded-Host $server_name;
        }
    }

Save and close the file then start nginx

```shell
sudo service nginx start 
```

#### Run the application
If you haven't already started the application, use the commands below
```shell
npm run serve
node server.js
```

Now you should be able to access the demo app using the url ```https://localhost```

**Note** since we are using self-signed certificate for HTTPS, browsers will display warning message and you may have to manually accept the risk to proceed to the web application.

#### Testing passwordless authentication

You can now register a new user by clicking the Sign-Up link on the login form, this version of the demo app requires user to register a FIDO2 authenticator device during registration, you need to either use a FIDO2 key or use the built-in authenticator in your device if you have one.

Sign-up and sign-in flows are implemented in ```src/components/auth/SignUpForm``` and ```SignInForm```. Backend component (needed for WebAuthn feature) is implemented in ```src/lib/authn.js```

![test sign-up](docs/images/test-recorded01.gif)

#### Testing RBAC and ABAC

In this demo, premium users can send messages to their contacts. To do that, temporary AWS credentials are issued to each user during sign-in based on their identity token. data in the token determine which role to assume for this user and some data from the token is also passed as session tags and can be referenced in the IAM policy.

Temporary credentials are retreived during sign-in using the function ```setTempCredentials```, this is part of ```src/components/auth/SignInForm```, these credentials are used from ```src/components/contacts/MessageContact``` component to send message through Amazon SNS.

##### Create a premium user

To change user subscription to premium and allow them to send messages, you need to edit user attributes ```custom:subscription``` and ```custom:messagingEnabled```, this can be done from Cognito admin console by editing user profile.

![test sign-up](docs/images/userprofile.png)

#### Clean-up

To terminate all AWS resources created for this demo application, use the command below to delete the stack that was created earlier
```shell
aws cloudformation delete-stack --stack-name cognito-workshop --region us-west-2
```

