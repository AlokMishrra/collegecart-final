/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import CCA from './pages/CCA';
import Cart from './pages/Cart';
import CategoryProducts from './pages/CategoryProducts';
import Delivery from './pages/Delivery';
import Home from './pages/Home';
import LoyaltyRewards from './pages/LoyaltyRewards';
import Orders from './pages/Orders';
import ProductDetails from './pages/ProductDetails';
import Profile from './pages/Profile';
import UserManagement from './pages/UserManagement';
import Wishlist from './pages/Wishlist';
import Shop from './pages/Shop';
import StaffPortal from './pages/StaffPortal';
import __Layout from './Layout.jsx';


export const PAGES = {
    "CCA": CCA,
    "Cart": Cart,
    "CategoryProducts": CategoryProducts,
    "Delivery": Delivery,
    "Home": Home,
    "LoyaltyRewards": LoyaltyRewards,
    "Orders": Orders,
    "ProductDetails": ProductDetails,
    "Profile": Profile,
    "UserManagement": UserManagement,
    "Wishlist": Wishlist,
    "Shop": Shop,
    "StaffPortal": StaffPortal,
}

export const pagesConfig = {
    mainPage: "Shop",
    Pages: PAGES,
    Layout: __Layout,
};