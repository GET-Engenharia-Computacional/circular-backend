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
-- Table structure for table `campus_places`
--

DROP TABLE IF EXISTS `campus_places`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `campus_places` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `location` point NOT NULL /*!80003 SRID 4326 */,
  `description` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  SPATIAL KEY `campus_places_geo` (`location`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `campus_places`
--

LOCK TABLES `campus_places` WRITE;
/*!40000 ALTER TABLE `campus_places` DISABLE KEYS */;
INSERT INTO `campus_places` VALUES ('860881e1-a5ab-5106-a93a-dd7018e5d791','Faculdade de Engenharia','Faculdades',_binary '\æ\0\0\0\0\0\ï\É\ÃB­¯EÀi\Å7>\Ç5À','Faculdade de Engenharia â€” campus universitÃ¡rio.',1),('90898a7f-7fcb-53fe-a73c-58d90c1ccf3a','Instituto de CiÃªncias Humanas â€” ICH','Institutos',_binary '\æ\0\0\0\0\0anÈ®EÀ\â*‰¢ó\Å5À','Novo ICH. ReferÃªncia aproximada junto Ã  parada do instituto.',1),('959df1c4-583a-5d37-a61e-4533336743a8','NÃºcleo de PrÃ¡tica JurÃ­dica â€” NPJ Centro','ServiÃ§os externos',_binary '\æ\0\0\0\0\0\ê46¬EÀú\í\ëÀ9\Ã5À','Av. Presidente Itamar Franco, 988 â€” Centro. PosiÃ§Ã£o aproximada na avenida, a confirmar no nÂº 988. Unidade externa, nÃ£o atendida pelo circular do campus.',1),('c167edae-835e-5cc0-aae2-11a755e486a9','Hospital UniversitÃ¡rio â€” HU Dom Bosco','SaÃºde',_binary '\æ\0\0\0\0\0lxz¥,¯EÀ·b\Ù=\É5À','Av. EugÃªnio do Nascimento, s/n â€” Dom Bosco. Unidade externa ao campus; acesso pelo circular nÃ£o garantido.',1),('edef4a3c-d224-5e74-a144-3bca97ccbf7e','Biblioteca Central','Bibliotecas',_binary '\æ\0\0\0\0\0ª_šÀ8¯EÀ›IS*\Æ5À','Biblioteca Central, junto Ã  Reitoria.',1),('fa1ad670-e6ed-505b-a95a-e9ef2b321e2e','Restaurante UniversitÃ¡rio â€” RU Campus','AlimentaÃ§Ã£o',_binary '\æ\0\0\0\0\0\ä\É\å¯EÀ,Ôš\æ\Ç5À','4Âª plataforma, junto Ã  Engenharia. PosiÃ§Ã£o aproximada do prÃ©dio; confirmar entrada acessÃ­vel.',1),('fdf387e4-a246-5423-aa82-6139c7f0c58e','Biblioteca Setorial do ICH','Bibliotecas',_binary '\æ\0\0\0\0\0anÈ®EÀ\â*‰¢ó\Å5À','Complexo do ICH. ReferÃªncia do instituto; entrada da biblioteca a confirmar.',1);
/*!40000 ALTER TABLE `campus_places` ENABLE KEYS */;
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
