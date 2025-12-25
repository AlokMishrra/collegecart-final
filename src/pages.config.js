import Admin from './pages/Admin';
import Cart from './pages/Cart';
import CategoryProducts from './pages/CategoryProducts';
import Delivery from './pages/Delivery';
import Home from './pages/Home';
import LoyaltyRewards from './pages/LoyaltyRewards';
import Orders from './pages/Orders';
import ProductDetails from './pages/ProductDetails';
import Profile from './pages/Profile';
import Shop from './pages/Shop';
import UserManagement from './pages/UserManagement';
import Wishlist from './pages/Wishlist';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Admin": Admin,
    "Cart": Cart,
    "CategoryProducts": CategoryProducts,
    "Delivery": Delivery,
    "Home": Home,
    "LoyaltyRewards": LoyaltyRewards,
    "Orders": Orders,
    "ProductDetails": ProductDetails,
    "Profile": Profile,
    "Shop": Shop,
    "UserManagement": UserManagement,
    "Wishlist": Wishlist,
}

export const pagesConfig = {
    mainPage: "Shop",
    Pages: PAGES,
    Layout: __Layout,
};