import axios from 'axios';

/** Organization scope comes from the server session cookie, not client headers. */
axios.defaults.withCredentials = true;
