const config = {
  challenge: false, // Set to true if you want to enable password protection.
  users: {
    // You can add multiple users by doing username: 'password'.
    username: "password",
  },
  routes: true, // Change this to false if you just want to host a bare server.
  local: true, // Change this to false to disable local assets.
  apiusage: false, //Setting this to true will enable the ability to access this server as an api. This will be added soon. 
};
export default config;