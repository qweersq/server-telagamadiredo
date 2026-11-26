# ⚙ Server Katsikat TESTTING DEPLOYtest
An application serving as the backend API for the POS (Point of Sale) Katsikat system.
This server handles data processing, database management, authentication, and API endpoints required for seamless integration with the frontend application.

## ⚠ Application Usage
Get information about application commands.

### ⚡ Install Module
```javascript
npm install
```
### ⚡ Running DB Migration
- Create the database manually.
- Set the database name in the `.env` file.
- Run the migration
```javascript
npm run db:migrate
```
### ⚡ Running DB Seeder
- Populate the database with seed data
```javascript
npm run db:seed
```
### ⚡ Starting Application
- Start the application server
```javascript
npm start
```

## ⚠ Class Usage Information
Find which files are using functions from class X.

### ⚡ Folder Helpers
```plaintext
helpers/ :
	- (encryptionHelper.js) class EncryptionHelper [
		- function: encryptID()
			- middlewares/authMiddleware.js

		- function: decryptID()
			- middlewares/authMiddleware.js
		]

	- (generateInvoiceHelper.js) class GenerateInvoiceHelper [
		- function: generateOrderCode()
			- services/orderProductService.js
			- services/orderService.js
		]

	- (passwordHelper.js) class PasswordHelper [
		- function: comparePasswords()
			- services/authService.js
		]

	- (responseHelper.js) class ResponseHelper [
		- function: successResponse()
			- routes/photoRoutes.js
			- controllers/{ALL CONTROLLER}.js

		- function: errorResponse()
			- routes/photoRoutes.js
			- middlewares/authMiddleware.js
			- controllers/{ALL CONTROLLER}.js
		]
```
### ⚡ Folder Middlewares
```plaintext
middlewares/ :
	- (authMiddleware.js) class AuthMiddleware [
		- function: generateAccessToken()
			- services/authService.js

		- function: authenticateUser()
			- controllers/{ALL CONTROLLER}.js
		]

	- (photoUploaderMiddleware.js) class PhotoUploaderMiddleware [
		- function: configureUpload()
			- routes/photoRoutes.js
		]
```