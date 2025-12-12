import Shop from './pages/Shop';
import ProductDetails from './pages/ProductDetails';
import Cart from './pages/Cart';
import Orders from './pages/Orders';
import Admin from './pages/Admin';
import Delivery from './pages/Delivery';
import CategoryProducts from './pages/CategoryProducts';
import Profile from './pages/Profile';
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
}

export const pagesConfig = {
    mainPage: "Shop",
    Pages: PAGES,
    Layout: __Layout,
};