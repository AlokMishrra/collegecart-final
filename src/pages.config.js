import Shop from './pages/Shop';
import ProductDetails from './pages/ProductDetails';
import Cart from './pages/Cart';
import Orders from './pages/Orders';
import Admin from './pages/Admin';
import Delivery from './pages/Delivery';
import CategoryProducts from './pages/CategoryProducts';
import Profile from './pages/Profile';
import LoyaltyRewards from './pages/LoyaltyRewards';
import Wishlist from './pages/Wishlist';
import UserManagement from './pages/UserManagement';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Shop": Shop,
    "ProductDetails": ProductDetails,
    "Cart": Cart,
    "Orders": Orders,
    "Admin": Admin,
    "Delivery": Delivery,
    "CategoryProducts": CategoryProducts,
    "Profile": Profile,
    "LoyaltyRewards": LoyaltyRewards,
    "Wishlist": Wishlist,
    "UserManagement": UserManagement,
}

export const pagesConfig = {
    mainPage: "Shop",
    Pages: PAGES,
    Layout: __Layout,
};