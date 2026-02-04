import React from 'react';
import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

const blurhash =
  '|rF?hV%2WCj[ayj[a|j[az_NaeWBj@ayfRayfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQ';

export const FastImage = ({ source, style, contentFit = 'cover', transition = 200, ...props }) => {
  return (
    <Image
      style={style}
      source={source}
      placeholder={blurhash}
      contentFit={contentFit}
      transition={transition}
      cachePolicy="memory-disk"
      {...props}
    />
  );
};

const styles = StyleSheet.create({});
