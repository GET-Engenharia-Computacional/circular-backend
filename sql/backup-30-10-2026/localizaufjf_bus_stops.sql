CREATE DATABASE  IF NOT EXISTS `localizaufjf` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `localizaufjf`;
-- MySQL dump 10.13  Distrib 8.0.41, for Win64 (x86_64)
--
-- Host: localhost    Database: localizaufjf
-- ------------------------------------------------------
-- Server version	8.0.41

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `bus_stops`
--

DROP TABLE IF EXISTS `bus_stops`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bus_stops` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `short_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `long_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `location` point NOT NULL /*!80003 SRID 4326 */,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  SPATIAL KEY `bus_stops_geo` (`location`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bus_stops`
--

LOCK TABLES `bus_stops` WRITE;
/*!40000 ALTER TABLE `bus_stops` DISABLE KEYS */;
INSERT INTO `bus_stops` VALUES ('055fd345-f20a-5ea8-a846-b1af33068986','IAD','Instituto de Artes e Design (IAD)',_binary '\Ê\0\0\0\0\0e®∑\ﬂ\‰ØE¿D:\„ã\«5¿',1),('09c6c55b-9d12-5a33-9395-50b02870a2ac','Educa√ß√£o','Faculdade de Educa√ß√£o',_binary '\Ê\0\0\0\0\0µ1¿ÆE¿NÒdäÉ\∆5¿',1),('1d979d11-8aac-5253-a6f2-728a6b8d5125','Critt','Centro Regional de Inova√ß√£o e Transfer√™ncia de Tecnologia (Critt)',_binary '\Ê\0\0\0\0\0©P\›\\¸ØE¿ú\ﬁ\≈˚q\«5¿',1),('2b8ad1a1-07d8-5a00-8d9e-c588b66b670a','Veterinaria','Medicina Veterinaria',_binary '\Ê\0\0\0\0\02§\œ÷£¨E¿¬åd∆∞\√5¿',1),('431afb95-3c96-5e9b-ae02-9cb2c20ba32c','Direito','Faculdade de Direito',_binary '\Ê\0\0\0\0\0	bıØE¿¶ª\◊\'\∆5¿',1),('479068f1-eb25-57cc-bb56-b05014a6b39f','APES','APES',_binary '\Ê\0\0\0\0\0\Ív¸{VØE¿ef¯\≈5¿',1),('5111e4d1-36fb-5c2b-adf0-c1d339e1eeb8','Enfermagem','Faculdade de Enfermagem',_binary '\Ê\0\0\0\0\0f°ù”ÆE¿S\ÃA\–\—\∆5¿',1),('580296c3-c863-51d5-b33a-e3cc58fcdae0','Portao Sul','Curva da Represa',_binary '\Ê\0\0\0\0\0<«ùØE¿O\¬/^∑\«5¿',1),('59de3376-c63b-4998-b6df-eca4c346f303','ICH','ICH',_binary '\Ê\0\0\0\0\0î\Ïµ\√ƒÆE¿\›‘∞1\Ï\≈5¿',1),('60b8e02a-563f-5d8c-82c0-eada6852ef0c','Faculdade de Engenharia','Faculdade de Engenharia',_binary '\Ê\0\0\0\0\0\–\‹¿m§ØE¿1Ag\Ï\∆5¿',1),('671f292a-d242-59d8-a925-4e15e0248565','HU Santa Catarina','Hospital Universitario (HU) - Santa Catarina',_binary '\Ê\0\0\0\0\0bc∆≠E¿\‹3†õ\Êø5¿',1),('6864674e-5bda-5c6c-82ec-ab60bab61a56','HU','Hospital Universitario (HU)',_binary '\Ê\0\0\0\0\0MN\ÌSØE¿\¬\ﬁƒêú\»5¿',1),('6e33ceab-db2b-59b3-ac3b-51e659f77164','CBR','CBR',_binary '\Ê\0\0\0\0\0û–°öØE¿òˆ.v\«5¿',1),('6ef594bc-1681-4497-98db-c8065aa2b5a6','ICB Volta','ICB Volta',_binary '\Ê\0\0\0\0\0!≤wiØE¿4\Ÿ\“¸\«5¿',1),('82a48a52-b6a9-5c7f-ae03-643e35a12257','RU','Restaurante Universitario (RU)',_binary '\Ê\0\0\0\0\0ÿì\Z¢÷ØE¿>§O \r\«5¿',1),('86c309fb-ba93-56a5-a137-9c4f14049ec6','FAEFID','Faculdade de Educacao Fisica (FAEFID)',_binary '\Ê\0\0\0\0\0Å\ÌÜØE¿s∫\Ÿ\Âî\«5¿',1),('8c37f8f9-51ac-59a3-b4a0-bc3ef043dd19','Bombeiros','Corpo de Bombeiros',_binary '\Ê\0\0\0\0\0Kê!ØE¿óq´\∆\«5¿',1),('8e89e624-13c7-51ce-91d8-5e557df1ef4d','ICB','ICB',_binary '\Ê\0\0\0\0\0eA\ÍßsØE¿É/$\«5¿',1),('943be05d-08ab-5780-ae69-ac43cec19d3e','Economia','Faculdade de Economia',_binary '\Ê\0\0\0\0\0\‰©¨ûÆE¿\À\∆\Èè\∆5¿',1),('9fef247a-17ca-5e0b-8cc1-c99bfa9d884e','Faculdade de Odontologia','Faculdade de Odontologia',_binary '\Ê\0\0\0\0\0_£:ØE¿rIıì	\«5¿',1),('b55b548e-6802-50ef-9f85-784be236c133','ICH','ICH',_binary '\Ê\0\0\0\0\0an»ÆE¿\‚*â¢Û\≈5¿',1),('bb92210f-f130-5f51-b168-3d452770c041','ICE','ICE',_binary '\Ê\0\0\0\0\05@\Ë&ùØE¿.@îf\«5¿',1),('f3aed715-8335-5619-bad5-6c1dc50fd92f','Letras','Ponto Faculdade de Letras',_binary '\Ê\0\0\0\0\0úî˝aeØE¿ìbi∫W\∆5¿',1);
/*!40000 ALTER TABLE `bus_stops` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-30 12:43:56
