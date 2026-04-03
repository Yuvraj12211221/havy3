import React from "react";
import Hero from "../components/Home/Hero";
import Pricing from "../components/Home/Pricing";
import { useDictationCapture } from "../hooks/useDictationCapture";

const Home: React.FC = () => {
  useDictationCapture();

  return (
    <>
      <Hero />
      <Pricing />
    </>
  );
};

export default Home;