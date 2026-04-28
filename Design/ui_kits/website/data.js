// Fake catalog data for the UI kit demo.
window.CARS = [
  {
    id: "camry-70",
    brand: "Toyota", model: "Camry 70", year: 2021,
    country: "japan", body: "Седан", mileage: 48230,
    engine: "2.5 AT · Бензин", price: 2350000, badge: "Хит",
    photoTint: "#1a1d24", silhouette: "sedan",
  },
  {
    id: "lx570",
    brand: "Lexus", model: "LX 570", year: 2019,
    country: "japan", body: "Внедорожник", mileage: 76410,
    engine: "5.7 AT · Бензин", price: 7890000, badge: "Premium",
    photoTint: "#0f1218", silhouette: "suv",
  },
  {
    id: "byd-han",
    brand: "BYD", model: "Han EV", year: 2024,
    country: "china", body: "Седан", mileage: 1200,
    engine: "Electric · 506 л.с.", price: 4150000, badge: "Новинка",
    photoTint: "#171a22", silhouette: "sedan",
  },
  {
    id: "li-l9",
    brand: "Li Auto", model: "L9 Max", year: 2024,
    country: "china", body: "Кроссовер", mileage: 8400,
    engine: "Hybrid · AWD", price: 6200000, badge: null,
    photoTint: "#15181f", silhouette: "suv",
  },
  {
    id: "g80",
    brand: "Genesis", model: "G80", year: 2022,
    country: "korea", body: "Седан", mileage: 31200,
    engine: "3.0 AT · AWD", price: 4980000, badge: "Premium",
    photoTint: "#1a1d24", silhouette: "sedan",
  },
  {
    id: "palisade",
    brand: "Hyundai", model: "Palisade", year: 2023,
    country: "korea", body: "Кроссовер", mileage: 22890,
    engine: "3.8 AT · AWD", price: 4350000, badge: "Хит",
    photoTint: "#13161d", silhouette: "suv",
  },
  {
    id: "crown",
    brand: "Toyota", model: "Crown Crossover", year: 2023,
    country: "japan", body: "Кроссовер", mileage: 14600,
    engine: "2.5 Hybrid", price: 4720000, badge: null,
    photoTint: "#181b22", silhouette: "suv",
  },
  {
    id: "zeekr-001",
    brand: "Zeekr", model: "001", year: 2024,
    country: "china", body: "Лифтбек", mileage: 5400,
    engine: "Electric · AWD", price: 5380000, badge: "Новинка",
    photoTint: "#15181f", silhouette: "sedan",
  },
  {
    id: "kia-k9",
    brand: "Kia", model: "K9", year: 2022,
    country: "korea", body: "Седан", mileage: 41200,
    engine: "3.8 AT · AWD", price: 3890000, badge: null,
    photoTint: "#181b22", silhouette: "sedan",
  },
];

window.formatPrice = (n) => n.toLocaleString("ru-RU").replace(/,/g, "\u00a0") + "\u00a0₽";
window.formatKm = (n) => n.toLocaleString("ru-RU").replace(/,/g, "\u00a0") + "\u00a0км";

window.COUNTRY_LABEL = { japan: "Япония", china: "Китай", korea: "Корея" };
window.COUNTRY_FLAG = {
  japan: "../../assets/flags/japan.svg",
  china: "../../assets/flags/china.svg",
  korea: "../../assets/flags/korea.svg",
};
